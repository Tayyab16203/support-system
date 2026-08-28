/**
 * AWS Amplify / Cognito configuration.
 *
 * Reads Cognito identifiers from public env vars. These are NOT secrets —
 * they identify the user pool and app client, and token verification uses
 * Cognito public keys.
 */

import { Amplify } from "aws-amplify";

let configured = false;

export function configureAmplify(): void {
  if (configured) return;

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "",
      },
    },
  });

  configured = true;
}