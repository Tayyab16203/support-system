"""Bootstrap the first admin user.

Solves the chicken-and-egg problem: since only admins can create users via
the app, this script creates the very first admin directly in Cognito
(with a permanent password) and inserts the matching row in Supabase with
role='admin'.

Usage:
    python bootstrap_admin.py <email> <password> "<Full Name>"

Example:
    python bootstrap_admin.py admin@example.com Admin1234 "Site Admin"

This is a one-time local utility. Run it once, then create all other users
through the admin panel in the app.
"""

import asyncio
import sys

from app.integrations.aws.cognito_admin import cognito_admin
from app.integrations.supabase.client import get_table


async def bootstrap(email: str, password: str, name: str) -> None:
    """Create the first admin in Cognito + Supabase."""
    client = cognito_admin.client
    pool_id = cognito_admin.user_pool_id

    # 1. Create the user in Cognito, suppressing the invite email
    #    (we set a permanent password ourselves, so no temp password needed).
    try:
        client.admin_create_user(
            UserPoolId=pool_id,
            Username=email,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "name", "Value": name},
            ],
            MessageAction="SUPPRESS",
        )
        print(f"[Cognito] Created user {email}")
    except client.exceptions.UsernameExistsException:
        print(f"[Cognito] User {email} already exists, continuing.")

    # 2. Set a permanent password (so the user can log in immediately).
    client.admin_set_user_password(
        UserPoolId=pool_id,
        Username=email,
        Password=password,
        Permanent=True,
    )
    print("[Cognito] Set permanent password")

    # 3. Fetch the Cognito sub for this user.
    resp = client.admin_get_user(UserPoolId=pool_id, Username=email)
    attrs = {a["Name"]: a["Value"] for a in resp["UserAttributes"]}
    cognito_sub = attrs.get("sub", "")

    # 4. Upsert the user in Supabase with role=admin.
    table = get_table("users")
    existing = table.select("id").eq("cognito_sub", cognito_sub).limit(1).execute()
    if existing.data:
        table.update({"role": "admin", "name": name, "email": email}).eq(
            "cognito_sub", cognito_sub
        ).execute()
        print("[Supabase] Updated existing user to role=admin")
    else:
        table.insert(
            {
                "cognito_sub": cognito_sub,
                "email": email,
                "name": name,
                "role": "admin",
            }
        ).execute()
        print("[Supabase] Inserted admin user")

    print(
        f"\nSUCCESS. Admin ready. Log in at /login with:\n"
        f"  email: {email}\n"
        f"  password: (the one you provided)"
    )


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print('Usage: python bootstrap_admin.py <email> <password> "<Full Name>"')
        sys.exit(1)
    asyncio.run(bootstrap(sys.argv[1], sys.argv[2], sys.argv[3]))
