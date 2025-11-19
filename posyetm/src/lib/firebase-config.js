// Firebase configuration for hierarchical collection structure
// This can be moved to environment variables in production

export const FIREBASE_CONFIG = {
  companyCode: 'Company', // Company collection
  companyName: 'Company1', // Company document (default, can be overridden)
  account: 'Account1', // Account document (default, can be overridden)
};

// Helper function to get company/account from user context or use defaults
// This allows dynamic company/account based on logged-in user
const getCompanyConfig = (companyName = null, account = null) => {
  return {
    companyCode: FIREBASE_CONFIG.companyCode,
    companyName: companyName || FIREBASE_CONFIG.companyName,
    account: account || FIREBASE_CONFIG.account,
  };
};

// Helper function to build nested collection path
// Firestore structure must alternate: Collection/Document/Collection/Document...
// Structure: Company(collection)/{companyCode}(document)/Account(collection)/{accountId}(document)/Products(collection)/{category}(document)/products(collection)
// For products, we need: Company/{companyCode}/Account/{accountId}/Products/{category}/products
// This gives us 7 segments (odd) which is valid for a collection reference
export const buildProductsPath = (category = null, companyName = null, account = null) => {
  const { companyCode, companyName: compName, account: acc } = getCompanyConfig(companyName, account);
  // Base path: Company/{companyCode}/Account/{accountId}/Products
  // This is: collection/document/collection/document/collection (5 segments - odd, valid)
  const basePath = `${companyCode}/${compName}/Account/${acc}/Products`;
  
  if (category) {
    // Add category document and products collection: {category}/products
    // This makes it: collection/document/collection/document/collection/document/collection (7 segments - odd, valid)
    return `${basePath}/${category}/products`;
  }
  return basePath;
};

// Helper function to get all category paths
export const getAllCategoryPaths = (categories, companyName = null, account = null) => {
  return categories.map(category => buildProductsPath(category, companyName, account));
};

// Helper function to build transactions path
// Structure: Company(collection)/{companyCode}(document)/Account(collection)/{accountId}(document)/Transactions(collection)/{transactionId}(document)
// For transactions, we need: Company/{companyCode}/Account/{accountId}/Transactions
// This is: collection/document/collection/document/collection (5 segments - odd, valid)
export const buildTransactionsPath = (companyName = null, account = null) => {
  const { companyCode, companyName: compName, account: acc } = getCompanyConfig(companyName, account);
  // Path: Company/{companyCode}/Account/{accountId}/Transactions
  // This is: collection/document/collection/document/collection (5 segments - odd, valid)
  return `${companyCode}/${compName}/Account/${acc}/Transactions`;
};

// Helper function to build settings path
// Structure: Company(collection)/{companyCode}(document)/Account(collection)/{accountId}(document)/Settings(collection)/{settingId}(document)
// For settings, we need: Company/{companyCode}/Account/{accountId}/Settings
// This is: collection/document/collection/document/collection (5 segments - odd, valid)
export const buildSettingsPath = (companyName = null, account = null) => {
  const { companyCode, companyName: compName, account: acc } = getCompanyConfig(companyName, account);
  // Path: Company/{companyCode}/Account/{accountId}/Settings
  // This is: collection/document/collection/document/collection (5 segments - odd, valid)
  return `${companyCode}/${compName}/Account/${acc}/Settings`;
};

