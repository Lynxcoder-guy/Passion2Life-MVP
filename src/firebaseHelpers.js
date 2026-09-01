// ============================================================
// FIREBASE HELPER FUNCTIONS
// ============================================================
// This file gives you REUSABLE functions for common Firebase
// operations. Instead of writing the same code over and over,
// you call one of these helpers.
//
// HOW TO USE IN ANY COMPONENT:
//   import { addDocument, addNote } from '../firebaseHelpers'
//
//   // Add a new document to a collection
//   const newId = await addDocument('projects', { title: 'My Project' })
//
//   // Add a note to a project
//   await addNote('projectId123', 'I want to keep doing this...')
// ============================================================

import { addDoc, collection, doc, updateDoc, serverTimestamp, arrayUnion, setDoc } from 'firebase/firestore'
import { db } from './firebase'

// ------------------------------------------------------------
// 1. ADD A DOCUMENT (generic)
// ------------------------------------------------------------
// "Document" = one record/row in a collection (like a table).
// "Collection" = a group of documents (like a table).
//
// Example: addDocument('projects', { title: 'Learn Guitar' })
//   → creates a NEW document inside the "projects" collection
//   → Firebase auto-generates the document ID for you
//   → returns the new document's ID so you can use it later
// ------------------------------------------------------------
export async function addDocument(collectionName, data) {
  try {
    // addDoc = "add a new document"
    // collection(db, collectionName) = "point to this collection"
    // data = the object you want to save
    const docRef = await addDoc(collection(db, collectionName), {
      ...data, // spread your data (title, description, etc.)
      createdAt: serverTimestamp(), // auto-add a timestamp when created
    })

    // docRef.id = the auto-generated ID Firebase created
    // We return it so the caller can use it (e.g. to update later)
    return docRef.id
  } catch (error) {
    // If something goes wrong (no internet, bad permissions, etc.)
    // we log it and re-throw so the caller can show a message
    console.error(`Error adding document to "${collectionName}":`, error)
    throw error
  }
}

// ------------------------------------------------------------
// 2. ADD A NOTE (specific to your app)
// ------------------------------------------------------------
// This is a more SPECIFIC helper for YOUR app.
// It adds a note to a project's "notes" array.
//
// In Firestore, you can store arrays inside a document.
// This function:
//   1. Reads the project document
//   2. Appends your new note to the existing notes array
//   3. Saves it back
//
// NOTE: This uses updateDoc (update existing) NOT addDoc (add new).
// ------------------------------------------------------------
export async function addNote(projectId, noteText) {
  try {
    // doc(db, 'projects', projectId) = "point to ONE specific document"
    const projectRef = doc(db, 'projects', projectId)

    // updateDoc = "update an existing document"
    // We use arrayUnion() to ADD to the array without overwriting
    // the notes that are already there.
    await updateDoc(projectRef, {
      notes: arrayUnion({
        text: noteText,
        createdAt: serverTimestamp(),
      }),
    })

    return true // success
  } catch (error) {
    console.error('Error adding note:', error)
    throw error
  }
}

// ------------------------------------------------------------
// 3. ADD A NOTE (simple version - just a string array)
// ------------------------------------------------------------
// If you prefer to keep notes as simple strings instead of objects,
// use this version instead. It stores notes like: ["note 1", "note 2"]
// ------------------------------------------------------------
export async function addSimpleNote(projectId, noteText) {
  try {
    const projectRef = doc(db, 'projects', projectId)

    await updateDoc(projectRef, {
      notes: arrayUnion(noteText), // just the string, no object
    })

    return true
  } catch (error) {
    console.error('Error adding simple note:', error)
    throw error
  }
}

// ------------------------------------------------------------
// 4. ADD A DOCUMENT WITH A CUSTOM ID
// ------------------------------------------------------------
// Sometimes you want to CHOOSE the ID yourself instead of letting
// Firebase auto-generate one. Use setDoc for that.
//
// Example: addDocumentWithId('projects', 'my-custom-id', { title: 'X' })
// ------------------------------------------------------------
export async function addDocumentWithId(collectionName, customId, data) {
  try {
    // doc(db, collectionName, customId) = "point to a doc with THIS id"
    const docRef = doc(db, collectionName, customId)

    // setDoc = "create or overwrite this document"
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
    })

    return customId
  } catch (error) {
    console.error(`Error adding document with custom ID to "${collectionName}":`, error)
    throw error
  }
}

// ------------------------------------------------------------
// 5. ADD A NOTE TO A PROJECT (using the notes subcollection)
// ------------------------------------------------------------
// ALTERNATIVE APPROACH: Instead of storing notes in an array,
// you can create a SEPARATE "notes" subcollection inside each project.
// This is better if you expect MANY notes (hundreds+).
//
// Structure:
//   projects/{projectId}/notes/{noteId}
//
// Example: addNoteToSubcollection('projectId123', 'My note text')
// ------------------------------------------------------------
export async function addNoteToSubcollection(projectId, noteText) {
  try {
    // collection(db, 'projects', projectId, 'notes')
    // = "go to projects → this project → notes collection"
    const notesRef = collection(db, 'projects', projectId, 'notes')

    const docRef = await addDoc(notesRef, {
      text: noteText,
      createdAt: serverTimestamp(),
    })

    return docRef.id
  } catch (error) {
    console.error('Error adding note to subcollection:', error)
    throw error
  }
}

// ------------------------------------------------------------
// QUICK REFERENCE - WHICH ONE SHOULD I USE?
// ------------------------------------------------------------
// addDocument('projects', data)
//   → Use when creating a NEW project. Firebase makes the ID.
//
// addDocumentWithId('projects', 'myId', data)
//   → Use when you want to control the ID yourself.
//
// addNote(projectId, text)
//   → Use to add a note to a project's notes ARRAY.
//   → Good for small amounts of notes.
//
// addNoteToSubcollection(projectId, text)
//   → Use to add a note as a SEPARATE document.
//   → Good for many notes, easier to query later.
// ------------------------------------------------------------