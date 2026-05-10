import firebase_admin
from firebase_admin import credentials, auth
import sys

# Try to initialize the default app
try:
    firebase_admin.initialize_app()
except ValueError:
    pass

def create_or_update_admin(email, password):
    try:
        # Check if user exists
        user = auth.get_user_by_email(email)
        print(f"User {email} already exists. Updating password and claims.")
        auth.update_user(user.uid, password=password)
        auth.set_custom_user_claims(user.uid, {'admin': True})
        print(f"User {email} successfully updated and given admin rights.")
    except auth.UserNotFoundError:
        print(f"User {email} does not exist. Creating...")
        user = auth.create_user(
            email=email,
            password=password,
            display_name="Administrador Principal",
        )
        auth.set_custom_user_claims(user.uid, {'admin': True})
        print(f"User {email} successfully created and given admin rights.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_or_update_admin("admin@obelisco.ai", "admin123")
