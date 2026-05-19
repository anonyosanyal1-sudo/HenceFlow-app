import { 
  collection, 
  doc, 
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  serverTimestamp,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Task, Project, UserProfile, FirestoreErrorInfo, Comment, Company } from '../types';

function handleFirestoreError(error: unknown, operationType: any, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Profile
export const ensureUserProfile = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  try {
    await setDoc(userRef, cleanData({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      updatedAt: serverTimestamp()
    }), { merge: true });
  } catch (error) {
    console.error('Error ensuring user profile:', error);
  }
};

// Helper to remove undefined values before sending to Firestore
function cleanData<T extends object>(data: T): T {
  const cleaned = { ...data } as any;
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  return cleaned;
}

// Companies
export const createCompany = async (companyData: Partial<Company>) => {
  const path = 'companies';
  try {
    const docRef = await addDoc(collection(db, path), cleanData({
      ...companyData,
      ownerId: auth.currentUser?.uid,
      adminIds: [auth.currentUser?.uid],
      memberIds: [auth.currentUser?.uid],
      createdAt: serverTimestamp()
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, 'create', path);
  }
};

export const updateCompany = async (companyId: string, updates: Partial<Company>) => {
  const path = `companies/${companyId}`;
  try {
    const companyRef = doc(db, 'companies', companyId);
    await updateDoc(companyRef, cleanData(updates));
  } catch (error) {
    handleFirestoreError(error, 'update', path);
  }
};

export const deleteCompany = async (companyId: string) => {
  const path = `companies/${companyId}`;
  try {
    const companyRef = doc(db, 'companies', companyId);
    await deleteDoc(companyRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', path);
  }
};

export const subscribeToCompanies = (callback: (companies: Company[]) => void) => {
  const user = auth.currentUser;
  if (!user) return () => {};

  const q = query(
    collection(db, 'companies'),
    where('memberIds', 'array-contains', user.uid)
  );

  return onSnapshot(q, (snapshot) => {
    const companies = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || null)
      } as any as Company;
    });
    callback(companies);
  }, (error) => {
    handleFirestoreError(error, 'list', 'companies');
  });
};

// Projects
export const createProject = async (companyId: string, projectData: Partial<Project>) => {
  const path = `companies/${companyId}/projects`;
  try {
    const docRef = await addDoc(collection(db, 'projects'), cleanData({
      ...projectData,
      companyId,
      ownerId: auth.currentUser?.uid,
      members: projectData.members || [auth.currentUser?.uid],
      createdAt: serverTimestamp()
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, 'create', path);
  }
};

export const deleteProject = async (projectId: string) => {
  const path = `projects/${projectId}`;
  try {
    // Also delete all tasks for this project
    const q = collection(db, 'projects', projectId, 'tasks');
    const tasksSnapshot = await getDocs(q);
    const deleteBatch = tasksSnapshot.docs.map(t => deleteDoc(doc(db, 'projects', projectId, 'tasks', t.id)));
    await Promise.all(deleteBatch);

    const projectRef = doc(db, 'projects', projectId);
    await deleteDoc(projectRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', path);
  }
};

export const updateProject = async (projectId: string, updates: Partial<Project>) => {
  const path = `projects/${projectId}`;
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, cleanData(updates));
  } catch (error) {
    handleFirestoreError(error, 'update', path);
  }
};

export const subscribeToProjects = (companyId: string, callback: (projects: Project[]) => void) => {
  const user = auth.currentUser;
  if (!user || !companyId) return () => {};

  const q = query(
    collection(db, 'projects'), 
    where('companyId', '==', companyId),
    where('members', 'array-contains', user.uid)
  );

  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || null)
      } as any as Project;
    });
    callback(projects);
  }, (error) => {
    handleFirestoreError(error, 'list', 'projects');
  });
};

export const subscribeToUsers = (callback: (users: UserProfile[]) => void) => {
  const q = collection(db, 'users');
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        ...data,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt || null)
      } as any as UserProfile;
    });
    // Filter duplicates by uid if any (addDoc might have created multiples if not careful)
    const uniqueUsers = Array.from(new Map(users.map(u => [u.uid, u])).values());
    callback(uniqueUsers);
  }, (error) => {
    handleFirestoreError(error, 'list', 'users');
  });
};

// Tasks
export const createTask = async (projectId: string, taskData: Partial<Task>) => {
  const path = `projects/${projectId}/tasks`;
  try {
    const docRef = await addDoc(collection(db, 'projects', projectId, 'tasks'), cleanData({
      ...taskData,
      projectId,
      creatorId: auth.currentUser?.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, 'create', path);
  }
};

export const updateTask = async (projectId: string, taskId: string, updates: Partial<Task>) => {
  const path = `projects/${projectId}/tasks/${taskId}`;
  try {
    const taskRef = doc(db, 'projects', projectId, 'tasks', taskId);
    await updateDoc(taskRef, cleanData({
      ...updates,
      updatedAt: serverTimestamp()
    }));
  } catch (error) {
    handleFirestoreError(error, 'update', path);
  }
};

export const deleteTask = async (projectId: string, taskId: string) => {
  const path = `projects/${projectId}/tasks/${taskId}`;
  try {
    const taskRef = doc(db, 'projects', projectId, 'tasks', taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', path);
  }
};

export const subscribeToTasks = (projectId: string, callback: (tasks: Task[]) => void) => {
  const path = `projects/${projectId}/tasks`;
  const q = collection(db, 'projects', projectId, 'tasks');

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || null),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt || null),
      } as any as Task;
    });
    callback(tasks);
  }, (error) => {
    handleFirestoreError(error, 'list', path);
  });
};

// Comments
export const addComment = async (projectId: string, taskId: string, content: string, attachments?: string[]) => {
  const path = `projects/${projectId}/tasks/${taskId}/comments`;
  try {
    const docRef = await addDoc(collection(db, 'projects', projectId, 'tasks', taskId, 'comments'), cleanData({
      content,
      attachments: attachments || [],
      userId: auth.currentUser?.uid,
      createdAt: serverTimestamp(),
      taskId,
      projectId
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, 'create', path);
  }
};

export const subscribeToComments = (projectId: string, taskId: string, callback: (comments: Comment[]) => void) => {
  const path = `projects/${projectId}/tasks/${taskId}/comments`;
  const q = query(
    collection(db, 'projects', projectId, 'tasks', taskId, 'comments'),
    // Note: ordered list requires index in Firestore if combined with other queries
    // For now we'll sort on the client side to avoid index creation complexities unless needed
  );

  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || null)
      } as any as Comment;
    });
    
    // Sort by Date on client side
    const sorted = [...comments].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : Infinity;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : Infinity;
      if (dateA === dateB) return 0;
      return dateA - dateB;
    });
    
    callback(sorted);
  }, (error) => {
    handleFirestoreError(error, 'list', path);
  });
};

export const updateComment = async (projectId: string, taskId: string, commentId: string, updates: Partial<Comment>) => {
  const path = `projects/${projectId}/tasks/${taskId}/comments/${commentId}`;
  try {
    await updateDoc(doc(db, 'projects', projectId, 'tasks', taskId, 'comments', commentId), cleanData({
      ...updates
    }));
  } catch (error) {
    handleFirestoreError(error, 'update', path);
  }
};

export const deleteComment = async (projectId: string, taskId: string, commentId: string) => {
  const path = `projects/${projectId}/tasks/${taskId}/comments/${commentId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId, 'tasks', taskId, 'comments', commentId));
  } catch (error) {
    handleFirestoreError(error, 'delete', path);
  }
};
