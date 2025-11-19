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
            // Use collectionGroup to search across all Account subcollections
            const accountQuery = query(
              collectionGroup(db, 'Account'),
              where('uid', '==', firebaseUser.uid)
            );
            const accountSnapshot = await getDocs(accountQuery);
            
            if (!accountSnapshot.empty) {
              // Found the account document
              const accountDoc = accountSnapshot.docs[0];
              const accountData = { id: accountDoc.id, ...accountDoc.data() };
              setUserData(accountData);
              
              // Extract company and account information from the account document
              // companyCode is stored in the account document
              const userCompanyCode = accountData.companyCode || accountData.company;
              const userAccountId = firebaseUser.uid; // Use userId as account identifier
              
              if (userCompanyCode) {
                setCompanyName(userCompanyCode);
                setAccount(userAccountId);
              } else {
                // Fallback if companyCode not found
                console.warn('Company code not found in account document');
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
              }
              setIsAdmin(isHardcodedAdmin || userRole === 'admin');
            } else {
              // Account document not found - might be a new user or admin
              console.warn('Account document not found for user:', firebaseUser.uid);
              setUserData(null);
              
              // For hardcoded admin, allow access but don't set company/account
              if (isHardcodedAdmin) {
                setCompanyName(null);
                setAccount(null);
                setIsAdmin(true);
              } else {
                // Regular user without account document - set to null
                setCompanyName(null);
                setAccount(null);
                setIsAdmin(false);
              }
            }
          } catch (error) {
            console.error('Error fetching account data:', error);
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

