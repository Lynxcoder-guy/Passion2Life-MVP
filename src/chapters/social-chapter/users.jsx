import React from 'react'
import '../app.css'
export default function Users({ selectedUser }) {
  return(
    <div className="users-container">
        <h1>Youre on {selectedUser?.displayName || 'User'}'s profile</h1>
        <p>{selectedUser?.email || 'No email available.'}</p>
    </div>
    )}

function Users({ selectedUser }) {
  return(
    <div className="users-container">
        <h1>Youre on {selectedUser?.displayName || 'User'}'s profile</h1>
        <h3>{selectedUser?.email || 'No email available.'}</h3>
        <p>{selectedUser?.bio || 'No bio available.'}</p>
    </div>
    )}