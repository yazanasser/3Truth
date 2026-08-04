import os
import firebase_admin
from firebase_admin import credentials, firestore, auth
import logging
from flask import Blueprint, request, jsonify
import datetime

logger = logging.getLogger("billing")

# Initialize Firebase Admin
try:
    if os.path.exists('serviceAccountKey.json'):
        cred = credentials.Certificate('serviceAccountKey.json')
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin initialized successfully using serviceAccountKey.json.")
    else:
        # Fallback to default app if running in a Google Cloud environment or local dev without key
        firebase_admin.initialize_app()
        logger.info("Firebase Admin initialized using default credentials.")
    db = firestore.client()
except Exception as e:
    logger.warning(f"Failed to initialize Firebase Admin: {e}")
    db = None

billing_bp = Blueprint("billing", __name__)

# Price map (Backend defined limits)
PRICE_MAP = {
    "free": {"tier": "free", "monthly_allowance": 10000},
    "pro": {"tier": "pro", "monthly_allowance": 150000},
    "pro_plus": {"tier": "pro_plus", "monthly_allowance": 500000},
    "team": {"tier": "team", "monthly_allowance": 2000000},
}

WORD_PACKS = {
    "pack_10k": 10000,
    "pack_50k": 50000,
    "pack_150k": 150000,
    "pack_500k": 500000,
    "pack_1m": 1000000,
}

def verify_token(req):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise Exception("Missing or invalid Authorization header")
    token = auth_header.split(" ")[1]
    if db is None:
        return {"uid": "test_user_no_firebase"} # Fallback for local testing
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise Exception(f"Token verification failed: {e}")

def get_user_entitlement(user_ref):
    doc = user_ref.get()
    if not doc.exists:
        data = {
            "tier": "free",
            "monthly_allowance": 10000,
            "monthly_used": 0,
            "purchased_words": 0,
            "billing_period_start": datetime.datetime.now(datetime.timezone.utc),
            "billing_period_end": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=30)
        }
        user_ref.set(data)
        return data
    return doc.to_dict()

def verify_balance(uid, word_count):
    """
    Check if the user has enough words to proceed. 
    Does not consume them yet.
    """
    if db is None or word_count <= 0:
        return True
        
    user_ref = db.collection("users").document(uid)
    entitlement = get_user_entitlement(user_ref)
    
    allowance = entitlement.get("monthly_allowance", 10000)
    used = entitlement.get("monthly_used", 0)
    purchased = entitlement.get("purchased_words", 0)
    
    remaining_monthly = max(0, allowance - used)
    total_available = remaining_monthly + purchased
    
    if total_available >= word_count:
        return True
    
    raise Exception(f"Insufficient word balance. You need {word_count} words but have {total_available} left.")

@firestore.transactional
def consume_words_transaction(transaction, user_ref, word_count):
    snapshot = user_ref.get(transaction=transaction)
    if not snapshot.exists:
        data = {
            "tier": "free",
            "monthly_allowance": 10000,
            "monthly_used": 0,
            "purchased_words": 0,
            "billing_period_start": datetime.datetime.now(datetime.timezone.utc),
            "billing_period_end": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=30)
        }
        transaction.set(user_ref, data)
        snapshot_data = data
    else:
        snapshot_data = snapshot.to_dict()
    
    allowance = snapshot_data.get("monthly_allowance", 10000)
    used = snapshot_data.get("monthly_used", 0)
    purchased = snapshot_data.get("purchased_words", 0)
    
    remaining_monthly = max(0, allowance - used)
    
    if remaining_monthly >= word_count:
        transaction.update(user_ref, {"monthly_used": used + word_count})
        return True
    elif (remaining_monthly + purchased) >= word_count:
        # Consume all remaining monthly, then dip into purchased
        remaining_to_deduct = word_count - remaining_monthly
        transaction.update(user_ref, {
            "monthly_used": used + remaining_monthly,
            "purchased_words": purchased - remaining_to_deduct
        })
        return True
    else:
        return False

def consume_words(uid, word_count):
    if db is None or word_count <= 0:
        return True
        
    user_ref = db.collection("users").document(uid)
    transaction = db.transaction()
    success = consume_words_transaction(transaction, user_ref, word_count)
    if not success:
        raise Exception(f"Insufficient word balance for final consumption of {word_count} words.")
    return True

@billing_bp.route("/admin/grant", methods=["POST"])
def admin_grant():
    """
    Secure endpoint to grant test users specific plans or word packs.
    Requires ENABLE_ADMIN_BILLING=true, and the caller must be authenticated via Firebase
    and have an admin custom claim.
    """
    if os.environ.get("ENABLE_ADMIN_BILLING", "false").lower() != "true":
        return jsonify({"error": "Admin billing grants are disabled in this environment."}), 404
        
    try:
        caller_info = verify_token(request)
    except Exception as e:
        return jsonify({"error": str(e)}), 401
        
    # Verify explicit admin role/claim
    if not caller_info.get("admin"):
        return jsonify({"error": "Forbidden: Requires admin privileges"}), 403

    data = request.json or {}
    target_uid = data.get("uid")
    if not target_uid:
        return jsonify({"error": "Missing target uid"}), 400
        
    if db is None:
        return jsonify({"error": "Firestore not initialized"}), 500
        
    user_ref = db.collection("users").document(target_uid)
    entitlement = get_user_entitlement(user_ref)
    current_tier = entitlement.get("tier", "free")
    
    new_tier = data.get("tier")
    add_words = data.get("add_words")
    
    updates = {}
    
    if new_tier:
        tier_key = new_tier.lower()
        if tier_key not in PRICE_MAP:
            return jsonify({"error": f"Invalid tier: {new_tier}. Allowed: {list(PRICE_MAP.keys())}"}), 400
            
        tier_limits = PRICE_MAP[tier_key]
        updates["tier"] = tier_limits["tier"]
        updates["monthly_allowance"] = tier_limits["monthly_allowance"]
        updates["monthly_used"] = 0 # Optional reset when upgrading tier
        
    if add_words:
        try:
            words_to_add = int(add_words)
            if words_to_add < 0:
                return jsonify({"error": "add_words must be positive"}), 400
            current_purchased = entitlement.get("purchased_words", 0)
            updates["purchased_words"] = current_purchased + words_to_add
        except ValueError:
            return jsonify({"error": "add_words must be an integer"}), 400
            
    if updates:
        user_ref.set(updates, merge=True)
        
        # Log the grant
        db.collection("admin_grants").add({
            "admin_uid": caller_info.get("uid"),
            "target_uid": target_uid,
            "previous_tier": current_tier,
            "new_tier": updates.get("tier", current_tier),
            "added_words": add_words,
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "reason": data.get("reason", "Admin grant")
        })
        
        return jsonify({"success": True, "updates": updates, "target_uid": target_uid})
    else:
        return jsonify({"error": "No actions requested"}), 400
