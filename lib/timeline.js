import { 
  collection, 
  addDoc, 
  query, 
  getDocs, 
  orderBy,
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

const TIMELINE_COLLECTION = 'timeline';

/**
 * Log an action to the timeline
 * @param {Object} actionData - { userId, userName, userEmail, action, targetType, targetId, targetName, details }
 */
export async function logAction(actionData) {
  try {
    await addDoc(collection(db, TIMELINE_COLLECTION), {
      ...actionData,
      timestamp: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error logging action:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recent actions from the timeline
 * @param {number} maxResults - Maximum number of results to return
 */
export async function getTimeline(maxResults = 100) {
  try {
    const q = query(
      collection(db, TIMELINE_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate(),
    }));
  } catch (error) {
    console.error('Error getting timeline:', error);
    return [];
  }
}
