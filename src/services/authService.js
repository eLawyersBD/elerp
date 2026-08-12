import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, isFirebaseConfigured, db } from '../config/firebase';
import { defaultRoles } from '../database/seedData';
import { USER_SEEDS } from '../utils/userSeeds';
import { auditService } from './auditService';

/* ══════════════════════════════════════════════════════════════════════════
   MOCK USERS  —  offline / demo fallback
══════════════════════════════════════════════════════════════════════════ */
const mockUsers = [
  {
    uid:         'u-001',
    email:       'admin@erpforu.com',
    password:    'admin',
    displayName: 'System Admin',
    role:        'admin',
    roleId:      'role-admin',
    branchId:    'br-1',
    permissions: defaultRoles.find(r => r.id === 'role-admin')?.permissions || {},
    status:      'active',
    avatarColor: '#2563eb',
  },
  {
    uid:         'u-002',
    email:       'accountant@erpforu.com',
    password:    'admin',
    displayName: 'Chief Accountant',
    role:        'accountant',
    roleId:      'role-accountant',
    branchId:    'br-1',
    permissions: defaultRoles.find(r => r.id === 'role-accountant')?.permissions || {},
    status:      'active',
    avatarColor: '#7c3aed',
  },
  {
    uid:         'u-003',
    email:       'warehouse@erpforu.com',
    password:    'admin',
    displayName: 'Warehouse Manager',
    role:        'warehouse',
    roleId:      'role-warehouse',
    branchId:    'br-1',
    permissions: defaultRoles.find(r => r.id === 'role-warehouse')?.permissions || {},
    status:      'active',
    avatarColor: '#059669',
  },
  {
    uid:         'u-004',
    email:       'sales@erpforu.com',
    password:    'admin',
    displayName: 'Sales Executive',
    role:        'sales',
    roleId:      'role-sales',
    branchId:    'br-1',
    permissions: defaultRoles.find(r => r.id === 'role-sales')?.permissions || {},
    status:      'active',
    avatarColor: '#d97706',
  },
  {
    uid:         'u-005',
    email:       'superadmin@erpforu.com',
    password:    'admin123',
    displayName: 'Super Administrator',
    role:        'superadmin',
    roleId:      'role-superadmin',
    branchId:    'br-1',
    permissions: { '*': ['read', 'write', 'delete', 'approve'] },
    status:      'active',
    avatarColor: '#dc2626',
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   PERMISSION CHECKER
══════════════════════════════════════════════════════════════════════════ */
/**
 * Check if a user has a specific action on a module.
 * @param {Object}  user    — current user object
 * @param {string}  module  — module key: 'inventory', 'sales', 'accounting', etc.
 * @param {string}  action  — 'read' | 'write' | 'delete' | 'approve'
 * @returns {boolean}
 */
export const checkPermission = (user, module, action = 'read') => {
  if (!user) return false;

  const perms = user.permissions || {};

  // Wildcard superadmin
  if (perms['*']?.includes(action)) return true;
  if (perms['*']?.includes('*'))    return true;

  // Module-specific
  const modulePerms = perms[module] || [];
  return modulePerms.includes(action) || modulePerms.includes('*');
};

/* ══════════════════════════════════════════════════════════════════════════
   AUTH SERVICE
══════════════════════════════════════════════════════════════════════════ */
export const authService = {

  _jitSync: async (profile, password) => {
    if (isFirebaseConfigured() && auth && profile.email) {
      try {
        await signInWithEmailAndPassword(auth, profile.email, password);
      } catch (fbErr) {
        if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, profile.email, password);
            await setDoc(doc(db, 'users', profile.employeeCode || profile.uid), {
              uid: profile.employeeCode || profile.uid,
              email: profile.email,
              displayName: profile.displayName,
              role: profile.role,
              status: profile.status || 'active',
              avatarColor: profile.avatarColor || '#3b82f6'
            }, { merge: true });
          } catch (createErr) {
            console.warn("[Firebase JIT authService] Failed to dynamically create user:", createErr.message);
          }
        } else {
          console.warn("[Firebase JIT authService] Sign in failed during JIT sync:", fbErr.message);
        }
      }
    }
  },

  /* ── Get / Save Users from localStorage ── */
  getUsers: () => {
    try {
      const stored = localStorage.getItem('erp_users');
      if (stored) return JSON.parse(stored);
      localStorage.setItem('erp_users', JSON.stringify(mockUsers));
      return mockUsers;
    } catch {
      return mockUsers;
    }
  },

  saveUsersList: (users) => {
    localStorage.setItem('erp_users', JSON.stringify(users));
  },

  saveUser: async (userData, currentUser) => {
    // 1. Try MySQL backend first
    try {
      await fetch('/api/user-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode: userData.uid, // map uid to employeeCode
          username: userData.email.split('@')[0],
          fullName: userData.displayName,
          email: userData.email,
          password: userData.password || 'admin123',
          mustChangePassword: userData.mustChangePassword !== undefined ? userData.mustChangePassword : false,
          role: userData.role,
          status: userData.status,
          avatarColor: userData.avatarColor || '#3b82f6'
        })
      });
      console.log('[authService] Saved user to MySQL successfully.');
    } catch (error) {
      console.warn('[authService] Failed to save user to MySQL, falling back to LocalStorage', error.message);
    }

    const users = authService.getUsers();
    const isEdit = users.some(u => u.uid === userData.uid);
    let updatedUsers;
    
    // Assign permissions mapping based on role
    const rolePermissions = defaultRoles.find(r => r.name.toLowerCase() === userData.role.toLowerCase() || r.id === `role-${userData.role}`)?.permissions || {};
    const finalUser = {
      ...userData,
      permissions: userData.role === 'superadmin' ? { '*': ['read', 'write', 'delete', 'approve'] } : rolePermissions,
      avatarColor: userData.avatarColor || '#3b82f6',
    };

    if (isEdit) {
      const oldUser = users.find(u => u.uid === userData.uid);
      updatedUsers = users.map(u => u.uid === userData.uid ? { ...u, ...finalUser } : u);
      authService.saveUsersList(updatedUsers);
      await auditService.logUpdate(currentUser, 'settings', userData.uid, userData.email, `Updated user account details: ${userData.displayName} (${userData.role})`, oldUser, finalUser);
    } else {
      updatedUsers = [...users, finalUser];
      authService.saveUsersList(updatedUsers);
      await auditService.logCreate(currentUser, 'settings', userData.uid, userData.email, `Created new user account: ${userData.displayName} (${userData.role})`, finalUser);
    }
  },

  toggleUserStatus: async (uid, currentUser) => {
    const users = authService.getUsers();
    const user = users.find(u => u.uid === uid);
    if (!user) throw new Error('User not found.');
    if (user.email === 'admin@erpforu.com' || user.email === 'superadmin@erpforu.com') {
      throw new Error('System protection: Primary administrator accounts cannot be deactivated.');
    }
    const newStatus = user.status === 'active' ? 'inactive' : 'active';

    // 1. Try MySQL backend first
    try {
      await fetch('/api/user-credentials/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode: uid, status: newStatus })
      });
      console.log('[authService] Toggled status in MySQL successfully.');
    } catch (error) {
      console.warn('[authService] Failed to toggle user status in MySQL, falling back to LocalStorage', error.message);
    }

    const oldUser = { ...user };
    const newUser = { ...user, status: newStatus };
    const updatedUsers = users.map(u => u.uid === uid ? newUser : u);
    authService.saveUsersList(updatedUsers);
    
    await auditService.logUpdate(currentUser, 'settings', uid, user.email, `Changed user status for ${user.displayName} to ${newStatus}`, oldUser, newUser);
    return newStatus;
  },

  /* ── Email / Password Login ── */
  login: async (email, password) => {
    const input = email.trim().toLowerCase();

    // Enforce configured email restriction (except admin/superadmin / employees bypasses)
    const isAdmin = input === "admin@erpforu.com" || 
                    input === "superadmin@erpforu.com" || 
                    input === "info@erpforu.com" || 
                    input === "ekram@elawyersbd.com" ||
                    input === "ekram@erpforu.com" ||
                    input === "hmekram@gmail.com" ||
                    input === "erp.elawyers@gmail.com";
    const isEmployee = USER_SEEDS.some(emp => 
      emp.email?.split(/[\n,;]+/).map(e => e.trim().toLowerCase()).includes(input)
    );

    if (!isAdmin && !isEmployee) {
      const stored = localStorage.getItem("email_portal_accounts");
      let configuredAccounts = [];
      if (stored) {
        configuredAccounts = JSON.parse(stored);
      } else {
        configuredAccounts = [
          { email: "exec@corp-elawyers.net" },
          { email: "vat-desk@corp-elawyers.net" },
          { email: "admin@erpforu.com" },
          { email: "accountant@erpforu.com" },
          { email: "ekram@elawyersbd.com" },
          { email: "ekram@erpforu.com" },
          { email: "hmekram@gmail.com" },
          { email: "erp.elawyers@gmail.com" }
        ];
      }
      const isConfigured = configuredAccounts.some(a => a.email.toLowerCase() === input);
      if (!isConfigured) {
        throw new Error("Access Denied: This email address is not configured in settings.");
      }
    }

    // Bypasses live Auth / MySQL for demo admin accounts to ensure they always work
    if (input === "admin@erpforu.com" && password === "admin123") {
      const profile = {
        uid: "ADMIN-0001",
        employeeCode: "ADMIN-0001",
        email: input,
        displayName: "System Admin",
        role: "superadmin",
        roleId: "role-superadmin",
        branchId: "br-1",
        permissions: { '*': ['read', 'write', 'delete', 'approve'] },
        avatarColor: '#dc2626',
        status: 'active'
      };
      await authService._jitSync(profile, password);
      localStorage.setItem('erp_current_user', JSON.stringify(profile));
      localStorage.setItem('mock_auth_user', JSON.stringify(profile));
      try {
        window.dispatchEvent(new CustomEvent('mock_auth_change', { detail: profile }));
      } catch (e) {
        console.warn('Could not dispatch auth change event', e);
      }
      return profile;
    }
    if (input === "hmekram@gmail.com" && password === "123456") {
      const profile = {
        uid: "ADMIN-0002",
        employeeCode: "ADMIN-0002",
        email: input,
        displayName: "Ekramul Haque",
        role: "admin",
        roleId: "role-admin",
        branchId: "br-1",
        permissions: defaultRoles.find(r => r.id === 'role-admin')?.permissions || {},
        avatarColor: '#2563eb',
        status: 'active'
      };
      await authService._jitSync(profile, password);
      localStorage.setItem('erp_current_user', JSON.stringify(profile));
      localStorage.setItem('mock_auth_user', JSON.stringify(profile));
      try {
        window.dispatchEvent(new CustomEvent('mock_auth_change', { detail: profile }));
      } catch (e) {
        console.warn('Could not dispatch auth change event', e);
      }
      return profile;
    }
    if (input === "info@erpforu.com" && password === "123456") {
      const profile = {
        uid: "ADMIN-0003",
        employeeCode: "ADMIN-0003",
        email: input,
        displayName: "ACCOUNTICA Cloud ERP Dhaka",
        role: "admin",
        roleId: "role-admin",
        branchId: "br-1",
        permissions: defaultRoles.find(r => r.id === 'role-admin')?.permissions || {},
        avatarColor: '#0891b2',
        status: 'active'
      };
      await authService._jitSync(profile, password);
      localStorage.setItem('erp_current_user', JSON.stringify(profile));
      localStorage.setItem('mock_auth_user', JSON.stringify(profile));
      try {
        window.dispatchEvent(new CustomEvent('mock_auth_change', { detail: profile }));
      } catch (e) {
        console.warn('Could not dispatch auth change event', e);
      }
      return profile;
    }
    if (input === "ekram@erpforu.com" && password === "123ekraM") {
      const profile = {
        uid: "ERP-0516",
        employeeCode: "ERP-0516",
        email: input,
        displayName: "Ekramul Islam Khandaker",
        role: "employee",
        roleId: "role-employee",
        branchId: "br-1",
        permissions: defaultRoles.find(r => r.id === 'role-employee')?.permissions || { hr: ['read'] },
        avatarColor: '#7c3aed',
        status: 'active'
      };
      await authService._jitSync(profile, password);
      localStorage.setItem('erp_current_user', JSON.stringify(profile));
      localStorage.setItem('mock_auth_user', JSON.stringify(profile));
      try {
        window.dispatchEvent(new CustomEvent('mock_auth_change', { detail: profile }));
      } catch (e) {
        console.warn('Could not dispatch auth change event', e);
      }
      return profile;
    }
    if (input === "ekram@elawyersbd.com" && password === "admin123") {
      const profile = {
        uid: "ELK-CONSULTANT-001",
        employeeCode: "ELK-CONSULTANT-001",
        email: input,
        displayName: "Ekramul Islam Khandaker",
        role: "employee",
        roleId: "role-employee",
        branchId: "br-1",
        permissions: defaultRoles.find(r => r.id === 'role-employee')?.permissions || { hr: ['read'] },
        avatarColor: '#7c3aed',
        status: 'active'
      };
      await authService._jitSync(profile, password);
      localStorage.setItem('erp_current_user', JSON.stringify(profile));
      localStorage.setItem('mock_auth_user', JSON.stringify(profile));
      try {
        window.dispatchEvent(new CustomEvent('mock_auth_change', { detail: profile }));
      } catch (e) {
        console.warn('Could not dispatch auth change event', e);
      }
      return profile;
    }

    // 1. Try MySQL backend authentication first
    try {
      const res = await fetch('/api/user-credentials/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmailOrCode: input, password })
      });
      
      if (res.ok) {
        const data = await res.json();
        const rolePermissions = defaultRoles.find(
          r => r.id === `role-${data.user.role}` || r.name.toLowerCase() === data.user.role.toLowerCase()
        )?.permissions || {};
        
        const profile = {
          ...data.user,
          permissions: data.user.role === 'superadmin' ? { '*': ['read', 'write', 'delete', 'approve'] } : rolePermissions,
        };

        // JIT Firebase Auth provisioning for MySQL verified users
        if (isFirebaseConfigured() && auth && data.user.email) {
          try {
            await signInWithEmailAndPassword(auth, data.user.email, password);
          } catch (fbErr) {
            if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential') {
              try {
                await createUserWithEmailAndPassword(auth, data.user.email, password);
                await setDoc(doc(db, 'users', data.user.employeeCode), {
                  uid: data.user.employeeCode,
                  email: data.user.email,
                  displayName: data.user.fullName,
                  role: data.user.role,
                  status: data.user.status,
                  avatarColor: data.user.avatarColor || '#3b82f6'
                }, { merge: true });
              } catch (createErr) {
                console.warn("[Firebase JIT authService] Failed to dynamically create user:", createErr.message);
              }
            } else {
              console.warn("[Firebase JIT authService] Sign in failed during JIT sync:", fbErr.message);
            }
          }
        }

        // Write to both ERP and HRMS sessions (SSO)
        localStorage.setItem('erp_current_user', JSON.stringify(profile));
        localStorage.setItem('mock_auth_user', JSON.stringify(profile));
        
        // Dispatch custom event to notify HRMS context in real time
        try {
          window.dispatchEvent(new CustomEvent('mock_auth_change', { detail: profile }));
        } catch (e) {
          console.warn('Could not dispatch auth change event', e);
        }

        return profile;
      } else if (res.status === 404 || res.status === 401 || res.status === 403 || res.status === 400) {
        const errData = await res.json();
        if (errData.errorCode === 'auth/user-disabled') {
          throw new Error('This account has been deactivated. Please contact your system administrator.');
        }
        throw new Error(authService._friendlyError(errData.errorCode));
      }
    } catch (error) {
      if (error.message && (error.message.includes('deactivated') || error.message.includes('Invalid') || error.message.includes('disabled') || error.message.includes('Incorrect'))) {
        throw error;
      }
      console.warn('[authService] MySQL backend is unreachable. Falling back to local offline mode.', error.message);
    }

    // 2. Firebase live mode (if configured)
    const users = authService.getUsers();
    if (isFirebaseConfigured()) {
      try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const fireUser = userCred.user;

        const match = users.find(u => u.email === email);
        const employeeMatch = USER_SEEDS.find(emp => emp.email?.trim().toLowerCase() === email);

        if (match && match.status === 'inactive') {
          await signOut(auth);
          throw new Error('This account has been deactivated. Please contact your system administrator.');
        }

        let role = 'sales';
        let roleId = 'role-sales';
        let displayName = fireUser.displayName || fireUser.email.split('@')[0];
        let employeeCode = '';

        if (match) {
          role = match.role;
          roleId = match.roleId;
          displayName = match.displayName;
        } else if (employeeMatch) {
          role = 'Employee (ESS)';
          roleId = 'role-employee';
          displayName = employeeMatch.name;
          employeeCode = employeeMatch.employeeCode;
        }

        const rolePermissions = defaultRoles.find(r => r.id === roleId || r.name.toLowerCase() === role.toLowerCase())?.permissions || {};

        const profile = {
          uid:         fireUser.uid,
          email:       fireUser.email,
          displayName: displayName,
          photoURL:    fireUser.photoURL || null,
          role:        role,
          roleId:      roleId,
          employeeCode: employeeCode,
          branchId:    match?.branchId    || 'br-1',
          permissions: match?.permissions || rolePermissions,
          avatarColor: match?.avatarColor || '#2563eb',
          status:      'active',
        };

        // Sync user profile with Firestore so firestore rules can read the role
        try {
          await setDoc(doc(db, 'users', profile.uid), {
            uid: profile.uid,
            email: profile.email,
            displayName: profile.displayName,
            role: profile.role,
            roleId: profile.roleId,
            employeeCode: profile.employeeCode,
            status: profile.status,
            avatarColor: profile.avatarColor || '#2563eb'
          }, { merge: true });
          console.log(`[Firebase] User profile synced to Firestore: /users/${profile.uid}`);
        } catch (fsErr) {
          console.warn('[Firebase] Failed to sync user profile to Firestore:', fsErr.message);
        }

        localStorage.setItem('erp_current_user', JSON.stringify(profile));
        localStorage.setItem('mock_auth_user', JSON.stringify(profile));
        return profile;
      } catch (err) {
        console.error('Firebase login error:', err.code);
        throw Object.assign(new Error(authService._friendlyError(err.code)), { cause: err });
      }
    }

    // 3. Offline mock fallback
    const match = users.find(
      u => u.email === input && u.password === password
    );
    const employeeMatch = !match && USER_SEEDS.find(
      emp => emp.email?.trim().toLowerCase() === input && emp.otp === password
    );

    if (!match && !employeeMatch) throw new Error('Invalid email or password. Please try again.');
    if (match && match.status === 'inactive') throw new Error('This account has been deactivated. Please contact your system administrator.');

    let profile;
    if (match) {
      const { password: _omit, ...safeUser } = match;
      const rolePermissions = defaultRoles.find(r => r.id === `role-${safeUser.role}` || r.name.toLowerCase() === safeUser.role.toLowerCase())?.permissions || {};
      profile = {
        ...safeUser,
        permissions: safeUser.role === 'superadmin' ? { '*': ['read', 'write', 'delete', 'approve'] } : rolePermissions,
      };
    } else {
      const rolePermissions = defaultRoles.find(r => r.id === 'role-employee')?.permissions || {};
      profile = {
        uid:          employeeMatch.employeeCode,
        employeeCode: employeeMatch.employeeCode,
        email:        employeeMatch.email,
        displayName:  employeeMatch.name,
        role:         'employee',
        roleId:       'role-employee',
        branchId:     'br-1',
        permissions:  rolePermissions,
        avatarColor:  '#2563eb',
        status:       'active',
      };
    }

    // JIT Firebase Auth provisioning for offline fallback users
    if (isFirebaseConfigured() && auth && profile.email) {
      try {
        await signInWithEmailAndPassword(auth, profile.email, password);
      } catch (fbErr) {
        if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, profile.email, password);
            await setDoc(doc(db, 'users', profile.employeeCode || profile.uid), {
              uid: profile.employeeCode || profile.uid,
              email: profile.email,
              displayName: profile.displayName,
              role: profile.role,
              status: profile.status || 'active',
              avatarColor: profile.avatarColor || '#3b82f6'
            }, { merge: true });
          } catch (createErr) {
            console.warn("[Firebase JIT Offline authService] Failed to dynamically create user:", createErr.message);
          }
        } else {
          console.warn("[Firebase JIT Offline authService] Sign in failed during JIT sync:", fbErr.message);
        }
      }
    }

    localStorage.setItem('erp_current_user', JSON.stringify(profile));
    localStorage.setItem('mock_auth_user', JSON.stringify(profile));
    return profile;
  },

  /* ── Google OAuth Login ── */
  loginWithGoogle: async () => {
    if (!isFirebaseConfigured()) {
      throw new Error('Google Sign-In requires a live Firebase connection.');
    }
    const userCred = await signInWithPopup(auth, googleProvider);
    const user     = userCred.user;

    const userEmail = user.email.trim().toLowerCase();
    const isAdminGoogle = userEmail === "admin@erpforu.com" || 
                          userEmail === "superadmin@erpforu.com" || 
                          userEmail === "info@erpforu.com" ||
                          userEmail === "ekram@elawyersbd.com" ||
                          userEmail === "ekram@erpforu.com" ||
                          userEmail === "hmekram@gmail.com" ||
                          userEmail === "erp.elawyers@gmail.com";
    const isEmployeeGoogle = USER_SEEDS.some(emp => 
      emp.email?.split(/[\n,;]+/).map(e => e.trim().toLowerCase()).includes(userEmail)
    );



    const users = authService.getUsers();
    const mockMatch = users.find(u => u.email?.trim().toLowerCase() === user.email?.trim().toLowerCase());
    const employeeMatch = USER_SEEDS.find(emp => emp.email?.trim().toLowerCase() === user.email?.trim().toLowerCase());

    if (mockMatch && mockMatch.status === 'inactive') {
      await signOut(auth);
      throw new Error('This account has been deactivated. Please contact your system administrator.');
    }

    // Check if Google request exists and status
    const requestsStr = localStorage.getItem('erp_user_id_requests') || '[]';
    const requests = JSON.parse(requestsStr);
    const requestMatch = requests.find(r => r.email?.trim().toLowerCase() === user.email?.trim().toLowerCase());

    if (requestMatch && requestMatch.status === 'Rejected') {
      await signOut(auth);
      throw new Error(requestMatch.rejectionReason || 'Your registration request has been rejected by an administrator.');
    }

    let role = 'sales';
    let roleId = 'role-sales';
    let displayName = user.displayName || user.email;
    let employeeCode = '';
    let isPendingGoogleUser = false;

    if (mockMatch) {
      role = mockMatch.role;
      roleId = mockMatch.roleId;
      displayName = mockMatch.displayName;
      employeeCode = mockMatch.uid;
    } else if (requestMatch && requestMatch.status === 'Approved') {
      // User is approved! Create user record JIT
      const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const newUid = requestMatch.taggedEmployeeCode || `u-${Date.now()}`;
      const newUser = {
        uid:         newUid,
        displayName: requestMatch.fullName || displayName,
        email:       user.email,
        role:        'employee',
        roleId:      'role-employee',
        branchId:    'br-1',
        status:      'active',
        avatarColor: randomColor,
        isGoogle:    true
      };
      
      users.push(newUser);
      authService.saveUsersList(users);
      
      role = newUser.role;
      roleId = newUser.roleId;
      displayName = newUser.displayName;
      employeeCode = newUser.uid;
    } else {
      // No match, and no approved request -> Register Pending Request & Login as explores-admin
      if (!requestMatch) {
        requests.push({
          id: `req-google-${user.uid || Date.now()}`,
          fullName: displayName,
          email: user.email,
          mobileNumber: user.phoneNumber || '',
          status: 'Pending',
          isGoogle: true,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('erp_user_id_requests', JSON.stringify(requests));
      }
      
      // Explore role as temporary administrator
      role = 'admin';
      roleId = 'role-admin';
      isPendingGoogleUser = true;
    }

    const rolePermissions = defaultRoles.find(r => r.id === roleId || r.name.toLowerCase() === role.toLowerCase())?.permissions || {};

    const profile = {
      uid:         user.uid,
      email:       user.email,
      displayName: displayName,
      photoURL:    user.photoURL || null,
      role:        role,
      roleId:      roleId,
      employeeCode: employeeCode,
      branchId:    mockMatch?.branchId    || 'br-1',
      permissions: mockMatch?.permissions || rolePermissions,
      avatarColor: mockMatch?.avatarColor || '#2563eb',
      status:      'active',
      isPendingGoogleUser: isPendingGoogleUser,
      isGoogle:    true
    };

    // Sync user profile with Firestore so firestore rules can read the role
    try {
      await setDoc(doc(db, 'users', profile.uid), {
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role,
        roleId: profile.roleId,
        employeeCode: profile.employeeCode,
        status: profile.status,
        avatarColor: profile.avatarColor || '#2563eb'
      }, { merge: true });
      console.log(`[Firebase] Google user profile synced to Firestore: /users/${profile.uid}`);
    } catch (fsErr) {
      console.warn('[Firebase] Failed to sync Google user profile to Firestore:', fsErr.message);
    }

    localStorage.setItem('erp_current_user', JSON.stringify(profile));
    localStorage.setItem('mock_auth_user', JSON.stringify(profile));
    return profile;
  },

  /* ── 3-Hour Request Expiry Check ── */
  checkGoogleRequestExpiry: () => {
    try {
      const requestsStr = localStorage.getItem('erp_user_id_requests');
      if (!requestsStr) return false;
      const requests = JSON.parse(requestsStr);
      const now = new Date();
      let updated = false;

      const updatedRequests = requests.map(r => {
        if (r.isGoogle && r.status === 'Pending' && r.created_at) {
          const diffMs = now - new Date(r.created_at);
          const diffHours = diffMs / (1000 * 60 * 60);
          if (diffHours >= 3) {
            updated = true;
            return {
              ...r,
              status: 'Rejected',
              rejectionReason: 'Google registration request expired (3-hour limit).'
            };
          }
        }
        return r;
      });

      if (updated) {
        localStorage.setItem('erp_user_id_requests', JSON.stringify(updatedRequests));
        
        // Check if current logged-in user is one of the expired requests
        const currentUserStr = localStorage.getItem('erp_current_user');
        if (currentUserStr) {
          const currentUser = JSON.parse(currentUserStr);
          if (currentUser.isPendingGoogleUser) {
            const req = updatedRequests.find(r => r.email === currentUser.email);
            if (req && req.status === 'Rejected') {
              // Sign out immediately
              localStorage.removeItem('erp_current_user');
              localStorage.removeItem('mock_auth_user');
              localStorage.setItem('erp_logout_reason', 'Google request expired (3-hour limit).');
              try {
                window.dispatchEvent(new CustomEvent('mock_auth_change', { detail: null }));
              } catch (e) {}
              return true; // Active user was signed out
            }
          }
        }
      }
    } catch (err) {
      console.error('Error running Google request expiry check:', err);
    }
    return false;
  },

  /* ── Get current session ── */
  getCurrentUser: () => {
    // Check Firebase auth state first
    if (isFirebaseConfigured() && auth?.currentUser) {
      const stored = localStorage.getItem('erp_current_user');
      return stored ? JSON.parse(stored) : null;
    }
    const stored = localStorage.getItem('erp_current_user');
    if (!stored) return null;
    try {
      const profile = JSON.parse(stored);
      if (profile && profile.role && (!profile.permissions || Object.keys(profile.permissions).length === 0)) {
        const rolePermissions = defaultRoles.find(
          r => r.id === `role-${profile.role}` || r.name.toLowerCase() === profile.role.toLowerCase()
        )?.permissions || {};
        profile.permissions = profile.role === 'superadmin' ? { '*': ['read', 'write', 'delete', 'approve'] } : rolePermissions;
      }
      return profile;
    } catch {
      return null;
    }
  },

  /* ── Logout ── */
  logout: async () => {
    if (isFirebaseConfigured()) {
      try { await signOut(auth); } catch { /* ignore sign-out errors */ }
    }
    localStorage.removeItem('erp_current_user');
    localStorage.removeItem('mock_auth_user');
    try {
      window.dispatchEvent(new CustomEvent('mock_auth_change', { detail: null }));
    } catch (e) {
      console.warn('Could not dispatch auth change event', e);
    }
  },

  /* ── Permission helpers ── */
  hasPermission: (user, moduleAction) => {
    // Legacy support: accepts 'accounting:read' style strings
    if (typeof moduleAction === 'string' && moduleAction.includes(':')) {
      const [module, action] = moduleAction.split(':');
      return checkPermission(user, module, action);
    }
    return checkPermission(user, moduleAction, 'read');
  },

  can: (user, module, action = 'read') => checkPermission(user, module, action),

  /* ── Friendly error messages ── */
  _friendlyError: (code) => {
    const map = {
      'auth/user-not-found':       'No account found with this email address.',
      'auth/wrong-password':       'Incorrect password. Please try again.',
      'auth/invalid-email':        'Please enter a valid email address.',
      'auth/user-disabled':        'This account has been disabled. Contact admin.',
      'auth/too-many-requests':    'Too many failed attempts. Try again later.',
      'auth/network-request-failed': 'Network error. Check your connection.',
      'auth/invalid-credential':   'Invalid email or password.',
    };
    return map[code] || 'Login failed. Please try again.';
  },

  /* ── Get all roles (for settings/user management) ── */
  getRoles: () => defaultRoles,

  /* ── Validate a user role has access to a given module ── */
  getModuleAccess: (user) => {
    if (!user) return {};
    const modules = ['inventory', 'purchases', 'sales', 'accounting', 'reports', 'ledgers', 'settings', 'audit', 'vouchers'];
    const access = {};
    modules.forEach(m => {
      access[m] = {
        read:    checkPermission(user, m, 'read'),
        write:   checkPermission(user, m, 'write'),
        delete:  checkPermission(user, m, 'delete'),
        approve: checkPermission(user, m, 'approve'),
      };
    });
    return access;
  },
};
