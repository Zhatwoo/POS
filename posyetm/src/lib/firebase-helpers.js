// Helper functions for Firebase operations
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebase';

// Example: Get a single document
export const getDocument = async (collectionName, documentId) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting document:', error);
    throw error;
  }
};

// Example: Get all documents from a collection
export const getCollection = async (collectionName) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting collection:', error);
    throw error;
  }
};

// Example: Add a new document
export const addDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  } catch (error) {
    console.error('Error adding document:', error);
    throw error;
  }
};

// Example: Update a document
export const updateDocument = async (collectionName, documentId, data) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, data);
    return true;
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

// Example: Delete a document
export const deleteDocument = async (collectionName, documentId) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// Example: Query documents with filters
export const queryDocuments = async (collectionName, filters = [], orderByField = null, limitCount = null) => {
  try {
    let q = collection(db, collectionName);
    
    // Apply filters
    filters.forEach(filter => {
      q = query(q, where(filter.field, filter.operator, filter.value));
    });
    
    // Apply ordering
    if (orderByField) {
      q = query(q, orderBy(orderByField.field, orderByField.direction || 'asc'));
    }
    
    // Apply limit
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error querying documents:', error);
    throw error;
  }
};

// Helper function to convert path string to Firestore path array
const pathToArray = (pathString) => {
  return pathString.split('/').filter(segment => segment.length > 0);
};

// Get all documents from a nested collection path
// Path format: "companyCode/account/products/categories/Beverages"
export const getNestedCollection = async (pathString) => {
  try {
    const pathArray = pathToArray(pathString);
    const querySnapshot = await getDocs(collection(db, ...pathArray));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting nested collection:', error);
    throw error;
  }
};

// Get all products from all categories in nested structure
// Returns array of all products from all category collections
export const getAllProductsFromCategories = async (categories, basePath) => {
  try {
    const allProducts = [];
    
    // Fetch products from each category
    for (const category of categories) {
      if (category === 'All') continue; // Skip 'All' category
      
      // Path should be: basePath/{category}/products (collection)
      const categoryPath = `${basePath}/${category}/products`;
      try {
        const categoryProducts = await getNestedCollection(categoryPath);
        // Add category to each product
        const productsWithCategory = categoryProducts.map(product => ({
          ...product,
          category: category,
          fromFirebase: true, // Mark as from Firebase
        }));
        allProducts.push(...productsWithCategory);
      } catch (error) {
        console.log(`Category ${category} not found or empty, skipping...`);
        // Continue with other categories even if one fails
      }
    }
    
    return allProducts;
  } catch (error) {
    console.error('Error getting all products from categories:', error);
    throw error;
  }
};

// Add document to nested collection
export const addNestedDocument = async (pathString, data) => {
  try {
    const pathArray = pathToArray(pathString);
    const docRef = await addDoc(collection(db, ...pathArray), data);
    return docRef.id;
  } catch (error) {
    console.error('Error adding nested document:', error);
    throw error;
  }
};

// Update document in nested collection
export const updateNestedDocument = async (pathString, documentId, data) => {
  try {
    const pathArray = pathToArray(pathString);
    const docRef = doc(db, ...pathArray, documentId);
    await updateDoc(docRef, data);
    return true;
  } catch (error) {
    console.error('Error updating nested document:', error);
    throw error;
  }
};

// Delete document from nested collection
export const deleteNestedDocument = async (pathString, documentId) => {
  try {
    const pathArray = pathToArray(pathString);
    const docRef = doc(db, ...pathArray, documentId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting nested document:', error);
    throw error;
  }
};

// Discover all categories dynamically from Firestore
// This function checks for categories by attempting to access category paths
// Since Firestore doesn't allow listing subcollections directly, we use a hybrid approach:
// 1. Check common category names
// 2. Check if category path exists and has products
// 3. Return all discovered categories
export const discoverCategories = async (basePath, commonCategories = []) => {
  try {
    const discoveredCategories = new Set();
    
    // Common categories to check (fallback list)
    const categoriesToCheck = commonCategories.length > 0 
      ? commonCategories.filter(cat => cat !== 'All')
      : ['Beverages', 'Food Items', 'Personal Care', 'Household Items', 'Electronics', 'Others'];
    
    // Check each potential category
    for (const category of categoriesToCheck) {
      const categoryPath = `${basePath}/${category}/products`;
      try {
        const products = await getNestedCollection(categoryPath);
        // Only add category if it actually has products (not just if path is accessible)
        if (products && products.length > 0) {
          discoveredCategories.add(category);
        }
      } catch (error) {
        // Category path doesn't exist, skip it
        continue;
      }
    }
    
    // Convert Set to sorted array
    const categoriesArray = Array.from(discoveredCategories).sort();
    console.log(`Discovered ${categoriesArray.length} categories:`, categoriesArray);
    
    return categoriesArray;
  } catch (error) {
    console.error('Error discovering categories:', error);
    // Return empty array - don't return common categories as fallback to prevent showing data from non-existent categories
    return [];
  }
};

// List all category collections from Products/categories path
// Since Firestore doesn't allow listing subcollections directly,
// we check known categories to see which ones have products
export const getAllCategoriesFromFirestore = async (basePath, knownCategories = []) => {
  try {
    // Use discoverCategories for dynamic discovery
    return await discoverCategories(basePath, knownCategories);
  } catch (error) {
    console.error('Error getting categories from Firestore:', error);
    return [];
  }
};

// Fetch all products from all categories dynamically
// Checks known categories and fetches products from each that exists
export const fetchAllProductsFromFirestore = async (basePath, knownCategories = []) => {
  try {
    const categories = await getAllCategoriesFromFirestore(basePath, knownCategories);
    const allProducts = [];
    
    console.log(`Found ${categories.length} categories with products in Firestore:`, categories);
    
    // Fetch products from each discovered category
    for (const category of categories) {
      // Path should be: basePath/{category}/products (collection)
      const categoryPath = `${basePath}/${category}/products`;
      try {
        const categoryProducts = await getNestedCollection(categoryPath);
        console.log(`Category "${category}": ${categoryProducts.length} products`);
        
        // Add category to each product
        const productsWithCategory = categoryProducts.map(product => ({
          ...product,
          category: category,
          fromFirebase: true,
        }));
        allProducts.push(...productsWithCategory);
      } catch (error) {
        console.log(`Error fetching products from category "${category}":`, error.message);
        // Continue with other categories even if one fails
      }
    }
    
    console.log(`Total products fetched: ${allProducts.length}`);
    return {
      categories,
      products: allProducts,
      categoryCounts: categories.reduce((acc, cat) => {
        const count = allProducts.filter(p => p.category === cat).length;
        return { ...acc, [cat]: count };
      }, {}),
    };
  } catch (error) {
    console.error('Error fetching all products from Firestore:', error);
    throw error;
  }
};

