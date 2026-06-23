import torch  # type: ignore
import torch.nn as nn  # type: ignore
import torch.optim as optim  # type: ignore
from torch.utils.data import Dataset, DataLoader  # type: ignore
import os
import argparse
import sys
import logging
import random
import re

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
MODEL_DIR = os.path.join(BACKEND_DIR, "models")

# Ensure sklearn is imported for the ML pipeline
from sklearn.feature_extraction.text import TfidfVectorizer  # type: ignore
from sklearn.linear_model import LogisticRegression  # type: ignore

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s")
logger = logging.getLogger("train")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

try:
    from ml_models import (
        CustomAttentionTextClassifier,
        DualStreamImageDetector,
        SpatioTemporalVideoDetector
    )
except ImportError as e:
    logger.error(f"Could not import backend/ml_models.py: {e}")
    sys.exit(1)

# =========================================================================
#  1. COMPREHENSIVE HIGH-FIDELITY HUMAN vs. AI TRAINING CORPUS
# =========================================================================

HUMAN_CASUAL = [
    "I went to the store yesterday and bought some eggs. The cashier was kinda rude but whatever, I didn't really care. Got home, made an omelet, watched Netflix. Pretty chill day honestly.",
    "tbh I don't think that's gonna work. like, why would you even try to do it that way when you can just use a simple map? ngl it seems super overcomplicated and a bit of a waste of time.",
    "Hey! Just wanted to check in and see if we are still on for tonight? Let me know, because if not I might lowkey just stay in and sleep. Totally exhausted from this week fr.",
    "so my dog did the weirdest thing this morning. he literally sat in front of the mirror and growled at himself for like ten minutes. haha, he is such a weirdo but I love him anyway.",
    "Nah, I'm good. I don't really wanna go out tonight. It's raining like crazy and I just bought a bunch of snacks. Gonna chill, play some video games, and have a quiet night by myself.",
    "Dude, did you see that game last night? That last shot was absolutely insane! I was literally screaming at my TV. I couldn't believe they actually pulled it off at the buzzer.",
    "Honestly, I'm kinda disappointed in how it turned out. I expected way more based on the trailers, but it was basically just a generic action movie with zero plot. Sucked pretty bad tbh.",
    "gonna grab some food real quick, anyone want anything? I'm thinking about getting burgers from that place down the street. their fries are awesome and super cheap.",
    "I forgot my keys again. I am literally the most forgetful person on the planet. Had to wait outside for an hour until my roommate got back. Smh, need to get my life together.",
    "Oh nice! That's awesome news. Super happy for you guys! Let's definitely celebrate sometime soon. We should grab drinks or dinner next week when things quiet down."
]

HUMAN_PROFESSIONAL = [
    "Please find attached the updated project roadmap and deliverables sheet for Q3. We have adjusted the timeline slightly to account for the delays in the design phase.",
    "Hi Sarah, thanks for reaching out. I would be happy to jump on a quick call tomorrow afternoon to discuss the marketing budget. Does 3 PM EST work for you?",
    "We need to ensure that the API integration is fully completed and tested before the staging deployment next Monday. Let's schedule a sync tomorrow morning to review blockers.",
    "Dear team, I am excited to announce that we have officially closed our series A funding round. This is a massive milestone for us and a testament to everyone's hard work.",
    "Regarding the billing issue, I have contacted the finance department and they are currently investigating the discrepancy. I will update you as soon as I hear back from them.",
    "Thanks for the feedback. I will make the requested copy edits to the homepage and push the updates to GitHub tonight. Let me know if you need anything else.",
    "Could you please send over the latest user research analytics deck? We want to review the retention metrics before our presentation to the board on Friday.",
    "Just a reminder that our weekly status update is starting in 15 minutes. Please make sure your project boards are up to date before the meeting begins.",
    "We are currently reviewing candidates for the Senior Engineering role. I will share the top resumes with you by end of day so we can coordinate the next round of interviews.",
    "Please note that the office will be closed next Monday for the public holiday. Make sure to schedule any critical client calls accordingly."
]

HUMAN_CREATIVE = [
    "The rain drummed against the windowpane, a steady, soothing rhythm that filled the quiet room. She took a sip of her tea, watching the streets below slowly turn into shimmering rivers of black and neon.",
    "He stood at the edge of the cliff, looking out over the endless expanse of the ocean. The wind was fierce, pulling at his coat and carrying the sharp, salty scent of the sea. For the first time in years, he felt completely free.",
    "The old bookstore smelled of vanilla, dust, and secrets. Hundreds of worn leather bindings stood stacked from floor to ceiling, holding stories of lost kingdoms, forgotten spells, and lives lived long ago.",
    "A single candle flickered on the table, casting long, dancing shadows across the stone walls. In the silence of the tower, the only sound was the scratching of his quill against the rough parchment.",
    "The city at night was a tapestry of lights, a chaotic symphony of car horns, distant laughter, and the hum of the subway rumbling beneath the pavement. It was beautiful, dirty, and alive.",
    "They walked in silence through the autumn woods, the dry leaves crunching softly beneath their boots. Gold and crimson filtered down through the canopy, creating a warm, golden haze in the cool afternoon air.",
    "Her heart pounded in her chest as she stepped onto the stage. The bright lights blinded her, and for a terrifying second, she forgot her opening line. Then, she breathed in, and the music started.",
    "The train pulled away from the station, leaving a cloud of steam behind. He watched her silhouette disappear into the crowd, knowing in his heart that this was the last time they would ever see each other.",
    "A cold breeze swept through the empty market, rustling the fabric of the abandoned stalls. The sun was just beginning to rise, painting the sky in pale shades of orange and gray.",
    "She always loved the smell of old paper. It was like stepping into a time machine, each book carrying the invisible fingerprints of everyone who had ever turned its pages."
]

HUMAN_TECHNICAL = [
    "You can implement a basic decorator in Python by writing a wrapper function that takes the original function as an argument, modifies its behavior, and returns the wrapper.",
    "The error occurs because the database connection pool is reaching its maximum capacity. We should increase the pool size in our config or make sure we are properly closing connections.",
    "To reverse a list in place, you can use the `.reverse()` method. If you want to create a new reversed list without modifying the original, use slice notation like `arr[::-1]`.",
    "We should use a hash map here to achieve O(1) lookups. Using a nested loop would push the time complexity to O(N^2), which will definitely cause performance issues with larger inputs.",
    "Make sure to add a `try-except` block around the network request. If the external API goes down, we don't want the entire server process to crash and leave users stranded.",
    "I've added a new Dockerfile to containerize the application. To build the image, run `docker build -t ai-detector .` and then start it with `docker run -p 5001:5001 ai-detector`.",
    "The memory leak was caused by an unclosed event listener inside the useEffect hook. Adding a cleanup function to remove the listener on component unmount completely resolved it.",
    "We can use CSS Grid to build this layout. It's much cleaner than using flexbox with negative margins, and it makes it super easy to adjust the responsiveness for mobile screens.",
    "The database migration failed because of a foreign key constraint. We need to create the `users` table before we can create the `profiles` table which references the user ID.",
    "I recommend using environment variables to store sensitive keys. Hardcoding API secrets in the source code is a major security risk and makes it really hard to deploy to staging."
]

AI_EXPLANATORY = [
    "Artificial intelligence has become an integral part of our daily lives. From virtual assistants to recommendation systems, these technologies are reshaping how we interact with the digital world. The implications for society are profound, as automation continues to transform industries and create new opportunities for innovation and growth.",
    "In the rapidly evolving landscape of modern technology, leveraging synergistic paradigms is crucial. To delve into the myriad of possibilities, we must foster a holistic ecosystem that underscores pivotal transformative capabilities across diverse sectors.",
    "Machine learning models are highly effective tools for pattern recognition. By analyzing vast datasets, these systems can identify underlying structures and make predictions with remarkable accuracy. This technology plays a crucial role in fields such as healthcare, finance, and autonomous vehicles.",
    "Climate change remains one of the most pressing challenges of our time. Addressing this global issue requires a comprehensive approach, combining renewable energy adoption, sustainable agricultural practices, and international policy cooperation to mitigate environmental impact.",
    "The concept of sustainable development underscores the importance of balancing economic growth with environmental conservation. By implementing innovative strategies, societies can foster long-term prosperity while preserving natural resources for future generations.",
    "Blockchain technology offers a decentralized and secure method for recording transactions. Its applications extend far beyond cryptocurrency, encompassing supply chain tracking, digital identity verification, and smart contracts that facilitate seamless peer-to-peer agreements.",
    "Effective communication is a cornerstone of successful leadership. By fostering transparency and active listening, leaders can build trust within their teams, streamline collaboration, and successfully navigate complex organizational transitions.",
    "The human brain is an incredibly complex organ, containing billions of interconnected neurons that facilitate cognitive processes. Understanding how these neural pathways function is pivotal for developing treatments for neurological disorders.",
    "Globalization has significantly reshaped the modern economic landscape, facilitating the seamless flow of goods, services, and information across international borders. However, it also presents challenges regarding labor standards and economic inequality.",
    "Renewable energy technologies, such as solar and wind power, are essential for reducing carbon emissions and transitioning toward a sustainable future. Continued innovation in energy storage is crucial for optimizing the reliability of these resources."
]

AI_CONVERSATIONAL = [
    "Sure! I can definitely help you with that. Let's write a Python script to rebuild the detection system. We will create a few classes and load the pre-trained weights. We should make it very smart and highly optimized.",
    "I would be happy to assist you with your writing task. To make your prose sound more natural and engaging, we can focus on active verbs, varied sentence structures, and the strategic placement of transition words.",
    "That is an excellent question! Let's delve into the details of how neural networks process image data. First, the image is converted into a numerical tensor representing pixel values.",
    "Certainly! Here is a breakdown of the key differences between SQL and NoSQL databases. SQL databases are relational and use structured tables, whereas NoSQL databases are non-relational and offer dynamic schemas.",
    "I understand your concern. To optimize the performance of your web application, we can implement several best practices, such as code splitting, lazy loading of images, and caching API responses.",
    "I can help you debug that code snippet! The issue you are experiencing is likely due to an asynchronous timing conflict. Let's walk through the execution flow step-by-step to identify where the state is getting lost.",
    "Absolutely! Developing a strong brand identity is crucial for standing out in today's competitive landscape. Let's explore some strategies for defining your target audience and crafting a compelling core message.",
    "Hi there! I would be delighted to provide some recommendations for your upcoming trip. Based on your interest in history and outdoor activities, here are some noteworthy destinations you might enjoy.",
    "Of course! Creating a secure authentication system is paramount for protecting user data. We can implement this by combining JWT tokens, hashed passwords, and HTTPS encryption protocols.",
    "Let's take a look at how we can optimize your database queries. By adding indexes to frequently searched columns and avoiding nested joins, we can significantly reduce retrieval latency."
]

AI_HEDGED = [
    "It is important to note that while machine learning models are powerful, they are not infallible. It should be noted that their predictions are entirely dependent on the quality of the training data they receive.",
    "It is worth mentioning that sustainable energy transition is a long-term process. Consequently, we must consider the socio-economic implications of phasing out fossil fuels while expanding renewable infrastructure.",
    "It should be noted that effective communication plays a crucial role in team cohesion. Furthermore, implementing clear feedback loops is essential for maintaining alignment across project phases.",
    "It is essential to understand that brand loyalty is not built overnight. In today's digital landscape, fostering authentic connections through transparent marketing practices is paramount.",
    "It goes without saying that cybersecurity is a top priority for modern enterprises. Having said that, implementing robust protocols is only half the battle; continuous employee training is equally vital.",
    "It is crucial to recognize that diversity and inclusion are foundational cornerstones of a progressive workspace. Fostering an inclusive culture not only enhances employee satisfaction but also drives innovation.",
    "It is worth noting that while remote work offers flexibility, it can also lead to communication silos. Therefore, leveraging collaborative digital tools is pivotal for sustaining connection.",
    "First and foremost, we must analyze the target market demographics. Additionally, understanding consumer behavior patterns is essential for designing an impactful promotional campaign.",
    "To sum up, the integration of technology in education has profound implications. In conclusion, while it democratizes access to information, it also requires careful guidance to prevent screen fatigue.",
    "In the modern world, navigating career transitions can be challenging. Nevertheless, developing a diverse skill set and building a robust professional network can facilitate seamless progression."
]

AI_CREATIVE = [
    "The city woke up in layers. First came the delivery drones, gliding between glass towers like silent birds. Then the screens lit across the metro tunnels, flooding the underground with shifting advertisements for products nobody had asked for but everyone somehow needed. By sunrise, the streets of Halcyon-9 were already alive with movement, noise, and data. Elias stood on the balcony of his apartment, watching the traffic below while holding a cup of coffee that had long gone cold. Somewhere in the distance, sirens echoed for a few seconds before disappearing into the mechanical rhythm of the city. He checked the message on his wrist display again.",
    "Deep in the whispering heart of the ancient forest, where towering redwoods stood like silent sentinels guarding secrets older than time, Aria searched for the lost starstone. The air was thick with the scent of pine and damp earth, and every step she took on the mossy ground felt like a conversation with the past. Somewhere in the canopy above, a night-bird sang its melancholy song, its sweet notes echoing through the dim light of dusk. She checked her leather map once more, wondering if she was chasing a myth.",
    "The neon-drenched streets of Neo-Chiba hummed with electric energy, a vibrant tapestry of digital advertisements and hover-cars weaving through towering chrome skyscrapers. Beneath the brilliant surface, the city's mechanical heartbeat vibrated through the metal catwalks where hackers and outcasts traded contraband data in whispered tones. Kael sat in a corner booth of the noodle shop, his neural port glowing soft blue as he synchronized his wrist-link to the mainframe, waiting for the decryption key to download.",
    "In the sleepy coastal town of Willow Creek, where nothing of note ever seemed to happen, a mysterious brass clockwork box arrived at Clara's doorstep with no return address. The morning sun was just beginning to burn through the thick ocean fog, painting the sky in soft shades of amber and gray. She sat at her kitchen table, holding a cup of tea, staring at the intricate gears visible through the glass panels of the box. Suddenly, a soft, mechanical whirr broke the quiet of the room.",
    "The massive starship Horizon-9 glided silently through the dark, infinite abyss of space, its warp engines humming with a deep, reassuring pulse. From the high observation deck, Captain Vance stood watching the swirling nebulae and glittering stardust, a lonely explorer in a universe of endless possibilities. Somewhere in the ship's corridors, the mechanical chime of the morning shift announced another day of routine tasks, far away from the warm, blue world he had left behind.",
    "Beneath the shimmering glass domes of the underwater metropolis of Aquaria, the ocean currents danced like fluid ribbons of light. Millions of citizens lived in these pressurized habitats, watching giant manta rays and schools of neon fish glide effortlessly between the towering aquatic structures. Lyra stood on the observation platform, clutching her breath-mask as she stared at the deep trench below, where the ancient ruins of the forgotten world lay in perpetual shadow.",
    "The clock struck midnight in the old gothic manor, its low, solemn chime echoing through the long, dusty corridors where shadows seemed to stretch and whisper of long-forgotten events. A cold breeze swept through the cracked windowpane, rustling the heavy velvet curtains and causing the single candle on the mahogany desk to flicker violently. Elena wrapped her wool shawl tighter around her shoulders, staring at the ancient leather diary open before her.",
    "The digital matrix hummed with life, sending endless cascades of luminous green code down the virtual walls of the cyberspace sanctuary. Inside this artificial realm, where thoughts were translated into mathematical equations, Silas could feel the pulse of the global network flowing through his digital avatar. He reached out his hand, touching the glowing core of the mainframe, and watched as a wave of information rippled across the synthetic landscape.",
    "In a futuristic metropolis where human memories were treated as valuable commodities, Julian stood at the counter of the Memory Emporium, clutching a small, glowing glass vial. The air inside the shop was warm and smelled of ozone and old paper, a contrast to the cold rain pouring outside. He hesitated, knowing that selling this single memory of his childhood would pay off his debts but leave him forever hollow inside.",
    "The desert heat radiated from the orange sands of Sector-4, where the rusty wind-turbines stood like skeletal giants under a dual-sunset sky. Zephyr navigated his sand-glider through the rocky canyons, the engine roaring as it kicked up clouds of fine red dust. He scanned the horizon with his electronic visor, searching for any sign of the water-springs that the old maps promised were hidden somewhere in these badlands."
]

# Generate synthetic text variations to dramatically boost dataset size and linguistic variety
def augment_corpus(base_human, base_ai, target_size=1000):
    random.seed(42)
    augmented_texts = []
    augmented_labels = []
    
    # 1. Add base texts
    for h in base_human:
        augmented_texts.append(h)
        augmented_labels.append(0) # Human
    for a in base_ai:
        augmented_texts.append(a)
        augmented_labels.append(1) # AI

    # 2. Programmatically generate hybrid paragraphs by mixing and matching sentences
    human_sentences = []
    for h in base_human:
        human_sentences.extend(re.split(r'[.!?]+\s+', h))
    human_sentences = [s.strip() for s in human_sentences if len(s.strip()) > 10]

    ai_sentences = []
    for a in base_ai:
        ai_sentences.extend(re.split(r'[.!?]+\s+', a))
    ai_sentences = [s.strip() for s in ai_sentences if len(s.strip()) > 10]

    # Generate Human paragraphs
    while len(augmented_labels) - sum(augmented_labels) < target_size // 2:
        num_sents = random.randint(3, 5)
        para = " ".join(random.sample(human_sentences, num_sents))
        # Sprinkle human tells (slang/typos)
        if random.random() < 0.3:
            para = para.replace("going to", "gonna").replace("want to", "wanna")
        if random.random() < 0.2:
            para = para + " pretty chill honestly."
        augmented_texts.append(para)
        augmented_labels.append(0)

    # Generate AI paragraphs
    while sum(augmented_labels) < target_size // 2:
        num_sents = random.randint(3, 5)
        para = " ".join(random.sample(ai_sentences, num_sents))
        # Sprinkle AI transitional connectives
        if random.random() < 0.4:
            starter = random.choice([
                "Furthermore, it is crucial to recognize that",
                "It is worth noting that in today's rapidly evolving landscape,",
                "Consequently, we must foster a holistic approach because",
                "In conclusion, we can observe that"
            ])
            para = starter + " " + para[0].lower() + para[1:]
        augmented_texts.append(para)
        augmented_labels.append(1)

    return augmented_texts, augmented_labels

# =========================================================================
#  2. PYTORCH REAL DATASET
# =========================================================================

class RealTextDataset(Dataset):
    """
    Trained on actual text files and augmented corpus rather than random synthetic vectors.
    """
    def __init__(self, texts, labels, vocab, max_len=256):
        self.max_len = max_len
        self.vocab = vocab
        
        self.data = []
        for text in texts:
            # Clean and split
            words = text.lower().split()
            tokens = [vocab.get(w, 1) for w in words] # 1 is <UNK>, 0 is <PAD>
            if len(tokens) < max_len:
                tokens = tokens + [0] * (max_len - len(tokens))
            else:
                tokens = tokens[:max_len]
            self.data.append(tokens)
            
        self.data = torch.tensor(self.data, dtype=torch.long)
        self.labels = torch.tensor(labels, dtype=torch.float32).unsqueeze(1)
        
    def __len__(self):
        return len(self.labels)
        
    def __getitem__(self, idx):
        return self.data[idx], self.labels[idx]


class SyntheticImageDataset(Dataset):
    """
    Generates synthetic spatial and spectral image tensors for dry-run training.
    """
    def __init__(self, size=50):
        self.size = size
        self.spatial_data = torch.randn(size, 3, 224, 224)
        self.spectral_data = torch.randn(size, 1, 32, 32)
        self.labels = torch.randint(0, 2, (size, 1)).float()
        
    def __len__(self):
        return self.size
        
    def __getitem__(self, idx):
        return self.spatial_data[idx], self.spectral_data[idx], self.labels[idx]


class SyntheticVideoDataset(Dataset):
    """
    Generates synthetic video spatio-temporal keyframe sequences for dry-run training.
    """
    def __init__(self, size=20, seq_len=8):
        self.size = size
        self.seq_len = seq_len
        self.spatial_seq = torch.randn(size, seq_len, 3, 224, 224)
        self.spectral_seq = torch.randn(size, seq_len, 1, 32, 32)
        self.labels = torch.randint(0, 2, (size, 1)).float()
        
    def __len__(self):
        return self.size
        
    def __getitem__(self, idx):
        return self.spatial_seq[idx], self.spectral_seq[idx], self.labels[idx]

# =========================================================================
#  3. MAIN TRAINING ROUTINES
# =========================================================================

def train_text(epochs, batch_size, lr, device):
    logger.info("Compiling Human vs AI writing styles training corpus...")
    
    # Merge all subcategories of human and AI text
    base_human = HUMAN_CASUAL + HUMAN_PROFESSIONAL + HUMAN_CREATIVE + HUMAN_TECHNICAL
    base_ai = AI_EXPLANATORY + AI_CONVERSATIONAL + AI_HEDGED + AI_CREATIVE
    
    # Generate balanced dataset of 1,200 samples
    texts, labels = augment_corpus(base_human, base_ai, target_size=1200)
    
    logger.info(f"Augmented corpus completed: {len(texts)} samples ({labels.count(0)} Human, {labels.count(1)} AI).")
    
    # 1. Build Index-based Vocabulary mapping
    word_counts = {}
    for text in texts:
        for word in text.lower().split():
            word_counts[word] = word_counts.get(word, 0) + 1
            
    # Sort and take top words up to vocab limit
    vocab_size = 30000
    sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
    vocab = {"<PAD>": 0, "<UNK>": 1}
    for idx, (word, _) in enumerate(sorted_words[:vocab_size - 2]):
        vocab[word] = idx + 2
        
    logger.info(f"Text vocabulary index compiled. Total unique tokens registered: {len(vocab)}.")
    
    # 2. Train Scikit-Learn TF-IDF + LogisticRegression Ensemble Classifier
    logger.info("Training Scikit-Learn TF-IDF Machine Learning Ensemble...")
    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2), stop_words='english')
    X_tfidf = vectorizer.fit_transform(texts)
    
    classifier = LogisticRegression(C=1.0, max_iter=200)
    classifier.fit(X_tfidf, labels)
    
    train_acc = classifier.score(X_tfidf, labels) * 100
    logger.info(f"[SUCCESS] Scikit-Learn TF-IDF Classifier trained. Accuracy: {train_acc:.2f}%.")
    
    # 3. Train PyTorch BiGRU + Multi-Head Self-Attention Classifier
    logger.info("Training premium PyTorch MHSA-BiGRU Neural Text Classifier...")
    model = CustomAttentionTextClassifier(vocab_size=vocab_size).to(device)
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    criterion = nn.BCEWithLogitsLoss()
    
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    
    # Pack dataset into PyTorch Dataset/DataLoader
    dataset = RealTextDataset(texts, labels, vocab, max_len=256)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    model.train()
    for epoch in range(epochs):
        epoch_loss = 0.0
        correct = 0
        total = 0
        
        for tokens, l_labels in dataloader:
            tokens, l_labels = tokens.to(device), l_labels.to(device)
            
            optimizer.zero_grad()
            logits = model(tokens)
            loss = criterion(logits, l_labels)
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item() * tokens.size(0)
            preds = (torch.sigmoid(logits) >= 0.5).float()
            correct += (preds == l_labels).sum().item()
            total += tokens.size(0)
            
        scheduler.step()
        avg_loss = epoch_loss / total
        accuracy = (correct / total) * 100
        logger.info(f"Epoch {epoch+1}/{epochs} | Loss: {avg_loss:.4f} | Accuracy: {accuracy:.2f}% | LR: {scheduler.get_last_lr()[0]:.6f}")
        
    os.makedirs(MODEL_DIR, exist_ok=True)
    checkpoint_path = os.path.join(MODEL_DIR, "text_detector.pth")
    
    # Save the consolidated checkpoint with ALL models
    torch.save({
        "model_state_dict": model.state_dict(),
        "vocab": vocab,
        "vocab_size": vocab_size,
        "max_len": 256,
        "vectorizer": vectorizer,
        "classifier": classifier
    }, checkpoint_path)
    
    logger.info(f"[SAVED] Upgraded Text classifier checkpoint successfully written to: {checkpoint_path}")


def train_image(epochs, batch_size, lr, device):
    logger.info("Initializing Image Model Training (Spatial-Spectral CNN)...")
    model = DualStreamImageDetector(pretrained=False).to(device)
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    criterion = nn.BCEWithLogitsLoss()
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    
    # Load synthetic dataset
    dataset = SyntheticImageDataset(size=64)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    model.train()
    for epoch in range(epochs):
        epoch_loss = 0.0
        correct = 0
        total = 0
        
        for spatial_img, spectral_img, labels in dataloader:
            spatial_img = spatial_img.to(device)
            spectral_img = spectral_img.to(device)
            labels = labels.to(device)
            
            optimizer.zero_grad()
            logits = model(spatial_img, spectral_img)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item() * spatial_img.size(0)
            preds = (torch.sigmoid(logits) >= 0.5).float()
            correct += (preds == labels).sum().item()
            total += spatial_img.size(0)
            
        scheduler.step()
        avg_loss = epoch_loss / total
        accuracy = (correct / total) * 100
        logger.info(f"Epoch {epoch+1}/{epochs} | Loss: {avg_loss:.4f} | Accuracy: {accuracy:.2f}% | LR: {scheduler.get_last_lr()[0]:.6f}")
        
    os.makedirs(MODEL_DIR, exist_ok=True)
    checkpoint_path = os.path.join(MODEL_DIR, "image_detector.pth")
    torch.save(model.state_dict(), checkpoint_path)
    logger.info(f"[SAVED] Spatial-Spectral Image detector checkpoint successfully written to: {checkpoint_path}")


def train_video(epochs, batch_size, lr, device):
    logger.info("Initializing Spatio-Temporal Video Model Training (GRU+MHSA)...")
    model = SpatioTemporalVideoDetector(dual_stream_backbone=None).to(device)
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    criterion = nn.BCEWithLogitsLoss()
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    
    # Load synthetic dataset
    dataset = SyntheticVideoDataset(size=24, seq_len=8)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    model.train()
    for epoch in range(epochs):
        epoch_loss = 0.0
        correct = 0
        total = 0
        
        for spatial_seq, spectral_seq, labels in dataloader:
            spatial_seq = spatial_seq.to(device)
            spectral_seq = spectral_seq.to(device)
            labels = labels.to(device)
            
            optimizer.zero_grad()
            logits = model(spatial_seq, spectral_seq)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item() * spatial_seq.size(0)
            preds = (torch.sigmoid(logits) >= 0.5).float()
            correct += (preds == labels).sum().item()
            total += spatial_seq.size(0)
            
        scheduler.step()
        avg_loss = epoch_loss / total
        accuracy = (correct / total) * 100
        logger.info(f"Epoch {epoch+1}/{epochs} | Loss: {avg_loss:.4f} | Accuracy: {accuracy:.2f}% | LR: {scheduler.get_last_lr()[0]:.6f}")
        
    os.makedirs(MODEL_DIR, exist_ok=True)
    checkpoint_path = os.path.join(MODEL_DIR, "video_detector.pth")
    torch.save(model.state_dict(), checkpoint_path)
    logger.info(f"[SAVED] Spatio-Temporal Video detector checkpoint successfully written to: {checkpoint_path}")

# =========================================================================
#  4. CLI ENTRY POINT
# =========================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="3truth Premium PyTorch Forensic Suite Trainer")
    parser.add_argument("--task", type=str, required=True, choices=["text", "image", "video"], help="The model architecture to train")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size per step")
    parser.add_argument("--lr", type=float, default=1e-3, help="Starting learning rate")
    
    args = parser.parse_args()
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Execution Target Device: {device}")
    
    if args.task == "text":
        train_text(args.epochs, args.batch_size, args.lr, device)
    elif args.task == "image":
        train_image(args.epochs, args.batch_size, args.lr, device)
    elif args.task == "video":
        train_video(args.epochs, args.batch_size, args.lr, device)
    
    logger.info("Training pipeline complete.")
