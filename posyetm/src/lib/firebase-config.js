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
// Structure: Company(collection)/Company1(document)/Account1(collection)/Products(document)/categories(collection)/{category}(document)/products(collection)
// For products, we need: Company/Company1/Account1/Products/categories/{category}/products
export const buildProductsPath = (category = null, companyName = null, account = null) => {
  const { companyCode, companyName: compName, account: acc } = getCompanyConfig(companyName, account);
  // Base path: Company/Company1/Account1/Products/categories
  // This is: collection/document/collection/document/collection
  const basePath = `${companyCode}/${compName}/${acc}/Products/categories`;
  
  if (category) {
    // Add category document and products collection: {category}/products
    // This makes it: collection/document/collection/document/collection/document/collection
    return `${basePath}/${category}/products`;
  }
  return basePath;
};

// Helper function to get all category paths
export const getAllCategoryPaths = (categories, companyName = null, account = null) => {
  return categories.map(category => buildProductsPath(category, companyName, account));
};

// Helper function to build transactions path
// Structure: Company(collection)/Company1(document)/Account1(collection)/Transactions(document)/transactions(collection)
// For transactions, we need: Company/Company1/Account1/Transactions/transactions
// This is: collection/document/collection/document/collection (5 segments - odd number, valid for collection reference)
// Following the same pattern as products: Company/Company1/Account1/Products/categories/{category}/products
export const buildTransactionsPath = (companyName = null, account = null) => {
  const { companyCode, companyName: compName, account: acc } = getCompanyConfig(companyName, account);
  // Path: Company/Company1/Account1/Transactions/transactions
  // This is: collection/document/collection/document/collection (5 segments - odd number, valid)
  return `${companyCode}/${compName}/${acc}/Transactions/transactions`;
};

// Helper function to build settings path
// Structure: Company(collection)/Company1(document)/Account1(collection)/Settings(document)/settings(collection)
// For settings, we need: Company/Company1/Account1/Settings/settings
// This is: collection/document/collection/document/collection (5 segments - odd number, valid)
export const buildSettingsPath = (companyName = null, account = null) => {
  const { companyCode, companyName: compName, account: acc } = getCompanyConfig(companyName, account);
  // Path: Company/Company1/Account1/Settings/settings
  // This is: collection/document/collection/document/collection (5 segments - odd number, valid)
  return `${companyCode}/${compName}/${acc}/Settings/settings`;
};

