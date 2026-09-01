// This file creates a unique ID for the current browser/device.
// The ID is saved in localStorage so the same device gets the same value
// every time the app loads, instead of generating a new random one every visit.
import { v4 as uuidv4 } from 'uuid'

export function getDeviceId() {
  // Check if this browser already has a saved device ID.
  let id = localStorage.getItem('deviceId')

  // If no ID exists yet, create one and save it.
  if (!id) {
    id = uuidv4()
    localStorage.setItem('deviceId', id)
  }

  // Return the saved or newly created device ID.
  return id
}
