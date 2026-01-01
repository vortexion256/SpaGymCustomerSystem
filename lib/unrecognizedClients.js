import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';

const UNRECOGNIZED_COLLECTION = 'unrecognizedClients';

/**
 * Add an unrecognized client (with invalid phone numbers)
 */
export async function addUnrecognizedClient(clientData) {
  try {
    const docRef = await addDoc(collection(db, UNRECOGNIZED_COLLECTION), {
      name: clientData.name?.trim() || '',
      phoneNumber: clientData.phoneNumber?.trim() || '', // Original phone number
      invalidPhoneNumbers: clientData.invalidPhoneNumbers || [], // Array of invalid numbers
      dateOfBirth: clientData.dateOfBirth ? Timestamp.fromDate(new Date(clientData.dateOfBirth)) : null,
      birthMonth: clientData.birthMonth || null,
      birthDay: clientData.birthDay || null,
      branch: clientData.branch?.trim() || '',
      reason: clientData.reason || 'Unrecognized phone number format',
      source: clientData.source || 'excel', // 'excel' or 'form'
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding unrecognized client:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all unrecognized clients
 */
export async function getAllUnrecognizedClients() {
  try {
    const q = query(
      collection(db, UNRECOGNIZED_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const clients = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      clients.push({
        id: doc.id,
        ...data,
        dateOfBirth: data.dateOfBirth?.toDate(),
      });
    });
    
    return clients;
  } catch (error) {
    console.error('Error getting unrecognized clients:', error);
    return [];
  }
}

/**
 * Update an unrecognized client (after user fixes the data)
 */
export async function updateUnrecognizedClient(clientId, clientData) {
  try {
    const clientRef = doc(db, UNRECOGNIZED_COLLECTION, clientId);
    
    const updateData = {
      name: clientData.name?.trim() || '',
      phoneNumber: clientData.phoneNumber?.trim() || '',
      dateOfBirth: clientData.dateOfBirth ? Timestamp.fromDate(new Date(clientData.dateOfBirth)) : null,
      birthMonth: clientData.birthMonth || null,
      birthDay: clientData.birthDay || null,
      branch: clientData.branch?.trim() || '',
      updatedAt: Timestamp.now(),
    };

    if (clientData.birthMonth && clientData.birthDay) {
      const currentYear = new Date().getFullYear();
      const month = parseInt(clientData.birthMonth);
      const day = parseInt(clientData.birthDay);
      const dateOfBirth = new Date(currentYear, month - 1, day);
      updateData.dateOfBirth = Timestamp.fromDate(dateOfBirth);
      updateData.birthMonth = month;
      updateData.birthDay = day;
    }

    await updateDoc(clientRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating unrecognized client:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an unrecognized client
 */
export async function deleteUnrecognizedClient(clientId) {
  try {
    const clientRef = doc(db, UNRECOGNIZED_COLLECTION, clientId);
    await deleteDoc(clientRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting unrecognized client:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Move an unrecognized client to regular clients (after fixing)
 * This will add it to the regular clients collection and delete from unrecognized
 */
export async function approveUnrecognizedClient(clientId, addClientFunction) {
  try {
    // Get the unrecognized client
    const unrecognizedRef = doc(db, UNRECOGNIZED_COLLECTION, clientId);
    const unrecognizedSnap = await getDoc(unrecognizedRef);
    
    if (!unrecognizedSnap.exists()) {
      return { success: false, error: 'Client not found' };
    }
    
    const data = unrecognizedSnap.data();
    
    // Add to regular clients
    const result = await addClientFunction({
      name: data.name,
      phoneNumber: data.phoneNumber,
      dateOfBirth: data.dateOfBirth?.toDate() || new Date(),
      birthMonth: data.birthMonth,
      birthDay: data.birthDay,
      branch: data.branch,
    });
    
    if (result.success) {
      // Delete from unrecognized
      await deleteDoc(unrecognizedRef);
      return { success: true, id: result.id };
    }
    
    return result;
  } catch (error) {
    console.error('Error approving unrecognized client:', error);
    return { success: false, error: error.message };
  }
}

