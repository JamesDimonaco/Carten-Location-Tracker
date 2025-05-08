"use server";

import { cookies } from "next/headers";

// Set the user's name in a cookie
export async function setUserName(name: string) {
  if (name.trim()) {
    (await cookies()).set({
      name: "userName",
      value: name.trim(),
      // 1 year expiration
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      path: "/",
    });
  }

  // Mark as visited
  (await cookies()).set({
    name: "hasVisited",
    value: "true",
    // 1 year expiration
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    path: "/",
  });
}

// Mark as visited without setting a name
export async function skipNameEntry() {
  (await cookies()).set({
    name: "hasVisited",
    value: "true",
    // 1 year expiration
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    path: "/",
  });
}

// Check if the user has visited before
export async function checkHasVisited() {
  const hasVisited = (await cookies()).get("hasVisited");
  return hasVisited?.value === "true";
}

// Get the user's name from cookies
export async function getUserName() {
  const userName = (await cookies()).get("userName");
  return userName?.value || null;
}
