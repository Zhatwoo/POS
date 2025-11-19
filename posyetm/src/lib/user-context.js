'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { collectionGroup, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

// Hardcoded super admin email - change this to your desired admin email
const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'admin@posystem.com';

// Create context
const UserContext = createContext({
  user: null,
  userData: null,
  loading: true,
  companyName: null,
  account: null,
  isAdmin: false,
});

// Custom hook to use user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

// User Provider Component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState(null);
  const [account, setAccount] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);
        setUser(firebaseUser);

        if (firebaseUser) {
          // Check if user is hardcoded super admin
          const isHardcodedAdmin = firebaseUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
          
          // Fetch account data from Company/{companyCode}/Account/{userId}
          try {
            let accountDoc = null;
            let accountData = null;
            let accountPath = null;
            
            // First, try collectionGroup query to find account document
            try {
              const accountQuery = query(
                collectionGroup(db, 'Account'),
                where('uid', '==', firebaseUser.uid)
              );
              const accountSnapshot = await getDocs(accountQuery);
              
              if (!accountSnapshot.empty) {
                accountDoc = accountSnapshot.docs[0];
                accountData = { id: accountDoc.id, ...accountDoc.data() };
                accountPath = accountDoc.ref.path;
                console.log('✅ Account document found via collectionGroup:', {
                  accountId: accountDoc.id,
                  path: accountPath,
                  data: accountData
                });
              }
            } catch (collectionGroupError) {
              console.warn('⚠️ collectionGroup query failed, trying fallback method:', {
                error: collectionGroupError?.message || collectionGroupError,
                code: collectionGroupError?.code,
                uid: firebaseUser.uid
              });
              
              // Fallback: Try direct lookup by checking if account exists at Company/{companyCode}/Account/{uid}
              // We'll need to search through Company documents, but that's expensive
              // For now, just log the error and continue
            }
            
            // If collectionGroup didn't find the account, try alternative approaches
            if (!accountDoc) {
              // Try to extract company code from email if it follows the pattern username@company.com
              const email = firebaseUser.email || '';
              const emailParts = email.split('@');
              if (emailParts.length === 2) {
                const domain = emailParts[1];
                // If domain is like "comp-xxxxx.com", extract the company code
                const domainParts = domain.split('.');
                if (domainParts.length > 0) {
                  const possibleCompanyCode = domainParts[0].toUpperCase();
                  console.log('ℹ️ Attempting direct lookup with possible company code from email:', possibleCompanyCode);
                  
                  try {
                    // Try direct path lookup: Company/{possibleCompanyCode}/Account/{uid}
                    const directAccountRef = doc(db, 'Company', possibleCompanyCode, 'Account', firebaseUser.uid);
                    const directAccountSnap = await getDoc(directAccountRef);
                    
                    if (directAccountSnap.exists()) {
                      accountDoc = directAccountSnap;
                      accountData = { id: directAccountSnap.id, ...directAccountSnap.data() };
                      accountPath = directAccountRef.path;
                      console.log('✅ Account document found via direct lookup:', {
                        accountId: directAccountSnap.id,
                        path: accountPath,
                        data: accountData
                      });
                    }
                  } catch (directLookupError) {
                    console.warn('⚠️ Direct lookup also failed:', directLookupError?.message || directLookupError);
                  }
                }
              }
            }
            
            // Process the found account document
            if (accountDoc && accountData) {
              setUserData(accountData);
              
              // Extract company and account information from the account document
              // First try to get companyCode from document data
              let userCompanyCode = accountData.companyCode || accountData.company;
              
              // Fallback: Extract companyCode from document path if not in data
              // Path format: Company/{companyCode}/Account/{accountId}
              if (!userCompanyCode && accountPath) {
                const pathParts = accountPath.split('/');
                // Find the index of 'Company' and get the next part (companyCode)
                const companyIndex = pathParts.indexOf('Company');
                if (companyIndex !== -1 && pathParts.length > companyIndex + 1) {
                  userCompanyCode = pathParts[companyIndex + 1];
                  console.log('ℹ️ Extracted companyCode from document path:', userCompanyCode);
                }
              }
              
              const userAccountId = firebaseUser.uid; // Use userId as account identifier
              
              if (userCompanyCode) {
                console.log('✅ Setting company and account:', {
                  companyName: userCompanyCode,
                  account: userAccountId
                });
                setCompanyName(userCompanyCode);
                setAccount(userAccountId);
              } else {
                // Fallback if companyCode not found in data or path
                console.error('❌ Company code not found in account document or path. Available fields:', Object.keys(accountData));
                console.error('Account document data:', accountData);
                console.error('Account document path:', accountPath);
                setCompanyName(null);
                setAccount(null);
              }
              
              // Check admin role - first check hardcoded admin, then check users collection for role
              let userRole = 'user';
              try {
                const usersDocRef = doc(db, 'users', firebaseUser.uid);
                const usersDocSnap = await getDoc(usersDocRef);
                if (usersDocSnap.exists()) {
                  userRole = usersDocSnap.data()?.role || 'user';
                }
              } catch (error) {
                // users collection might not exist, that's okay
                console.log('Users collection check skipped:', error?.message || error);
              }
              setIsAdmin(isHardcodedAdmin || userRole === 'admin');
            } else {
              // Account document not found - might be a new user or admin
              console.warn('⚠️ Account document not found for user:', {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                isHardcodedAdmin: isHardcodedAdmin
              });
              setUserData(null);
              
              // For hardcoded admin, allow access but don't set company/account
              if (isHardcodedAdmin) {
                console.log('ℹ️ Hardcoded admin detected - skipping company/account setup');
                setCompanyName(null);
                setAccount(null);
                setIsAdmin(true);
              } else {
                // Regular user without account document - set to null
                console.error('❌ Regular user without account document. User may need to complete registration.');
                setCompanyName(null);
                setAccount(null);
                setIsAdmin(false);
              }
            }
          } catch (error) {
            // Log full error details for debugging
            console.error('❌ Error fetching account data:', {
              error: error?.message || String(error),
              errorObject: error,
              code: error?.code,
              stack: error?.stack,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              errorType: typeof error,
              errorKeys: error ? Object.keys(error) : []
            });
            // Set to null if fetch fails - don't use defaults that show wrong data
            setUserData(null);
            setCompanyName(null);
            setAccount(null);
            // Still check hardcoded admin even if Firestore fetch fails
            setIsAdmin(isHardcodedAdmin);
          }
        } else {
          // User is not logged in
          setUserData(null);
          setCompanyName(null);
          setAccount(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
        setUserData(null);
        setCompanyName(null);
        setAccount(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userData,
    loading,
    companyName,
    account,
    isAdmin,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

