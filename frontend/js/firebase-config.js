// Global Lucide Fallback
if (typeof window.lucide === 'undefined') {
  window.lucide = { createIcons: () => {} };
}
// Global GSAP Fallback
if (typeof window.gsap === 'undefined') {
  window.gsap = {
    registerPlugin: () => {},
    to: (t, v) => { if(v?.onComplete) v.onComplete(); if(v?.onUpdate) v.onUpdate(); return { kill: () => {} }; },
    fromTo: (t, f, v) => { if(v?.onComplete) v.onComplete(); if(v?.onUpdate) v.onUpdate(); return { kill: () => {} }; },
    timeline: () => ({ to: function(t, v){ if(v?.onComplete) v.onComplete(); return this; }, fromTo: function(t, f, v){ if(v?.onComplete) v.onComplete(); return this; }, add: function(){ return this; }, play: function(){ return this; } }),
    set: () => {}
  };
  window.ScrollTrigger = {}; window.TextPlugin = {}; window.MotionPathPlugin = {};
}

// Global Firebase Mock if missing or partially loaded
if (typeof window.firebase === 'undefined') {
  const mockAuth = {
    onAuthStateChanged: (cb) => {
      const user = localStorage.getItem('mockUser') ? JSON.parse(localStorage.getItem('mockUser')) : null;
      setTimeout(() => cb(user), 10);
      return () => {};
    },
    signInWithEmailAndPassword: async (email, password) => {
      const mockUser = { email, uid: 'mock_uid_' + Math.random().toString(36).substr(2, 9) };
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
      return { user: mockUser };
    },
    createUserWithEmailAndPassword: async (email, password) => {
      const mockUser = { email, uid: 'mock_uid_' + Math.random().toString(36).substr(2, 9) };
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
      return { user: mockUser };
    },
    signOut: async () => {
      localStorage.removeItem('mockUser');
      window.location.reload();
    },
    currentUser: localStorage.getItem('mockUser') ? JSON.parse(localStorage.getItem('mockUser')) : null
  };
  
  const mockDb = {
    collection: () => ({
      doc: () => ({
        set: async () => {},
        get: async () => ({ exists: true, data: () => ({ plan: 'Ultimate' }) }),
        onSnapshot: (cb) => { cb({ exists: true, data: () => ({ plan: 'Ultimate' }) }); return () => {}; }
      })
    })
  };

  window.firebase = {
    initializeApp: () => {},
    auth: () => mockAuth,
    firestore: () => mockDb
  };
} else if (typeof window.firebase.auth !== 'function') {
  const mockAuth = {
    onAuthStateChanged: (cb) => {
      const user = localStorage.getItem('mockUser') ? JSON.parse(localStorage.getItem('mockUser')) : null;
      setTimeout(() => cb(user), 10);
      return () => {};
    },
    signInWithEmailAndPassword: async (email, password) => {
      const mockUser = { email, uid: 'mock-uid' };
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
      return { user: mockUser };
    },
    createUserWithEmailAndPassword: async (email, password) => {
      const mockUser = { email, uid: 'mock-uid' };
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
      return { user: mockUser };
    },
    signOut: async () => {
      localStorage.removeItem('mockUser');
      window.location.reload();
    },
    currentUser: localStorage.getItem('mockUser') ? JSON.parse(localStorage.getItem('mockUser')) : null
  };

  const mockDb = {
    collection: () => ({
      doc: () => ({
        set: async () => {},
        get: async () => ({ exists: true, data: () => ({ plan: 'Ultimate' }) }),
        onSnapshot: (cb) => { cb({ exists: true, data: () => ({ plan: 'Ultimate' }) }); return () => {}; }
      })
    })
  };
  
  window.firebase.auth = () => mockAuth;
  window.firebase.firestore = () => mockDb;
}

const firebaseConfig = {
  apiKey: "AIzaSyAo6Dni8nAxTabp3vFIKfsswxgJSthgqPI",
  authDomain: "aetheris-ede2e.firebaseapp.com",
  projectId: "aetheris-ede2e",
  storageBucket: "aetheris-ede2e.firebasestorage.app",
  messagingSenderId: "859171920854",
  appId: "1:859171920854:web:422ce20d2ac3009267e277",
  measurementId: "G-ZJKN1BXRX0"
};

let auth = null;
let db = null;

if (typeof firebase !== 'undefined') {
  try {
    firebase.initializeApp(firebaseConfig);
    if (typeof firebase.auth === 'function') {
      auth = firebase.auth();
      db = firebase.firestore();
    }
  } catch(e) {
    console.warn('Firebase init error:', e);
  }
}

// Owner email — this account automatically gets the Ultimate plan for free
const OWNER_EMAIL = 'yazannasser@gmail.com';

// Global Auth State Observer
if (auth) {
  auth.onAuthStateChanged((user) => {
    const authBtns = document.querySelectorAll('#auth-nav-btn, #auth-btn');
    authBtns.forEach(btn => {
      if (user) {
        btn.textContent = 'DASHBOARD';
        btn.href = 'detector.html'; // Assuming dashboard is the detector for now
      } else {
        btn.textContent = 'LOGIN';
        btn.href = 'signin.html';
      }
    });
  });
}
