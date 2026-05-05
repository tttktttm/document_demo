// ============================================
// Aspire Path 書類審査システム — Mock Configuration
// ============================================

import './sample-data.js';
import { 
  initializeApp, 
  auth, 
  db, 
  getStorage, 
  getAnalytics, 
  googleProvider 
} from './mock-firebase.js';

const storage = getStorage();
const analytics = getAnalytics();
const app = initializeApp();

export { app, auth, db, storage, analytics, googleProvider };
