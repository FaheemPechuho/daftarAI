"""Delete the Qdrant collection used by Daftar (see QDRANT_COLLECTION in .env, default daftar_kb).

Run from the backend directory:

    python -m scripts.delete_qdrant_collection
"""

from app.config import settings
from app.rag.store import delete_collection_if_exists, get_client


def main() -> None:
    client = get_client()
    name = settings.qdrant_collection
    if delete_collection_if_exists(client):
        print(f"Deleted Qdrant collection {name!r}.")
    else:
        print(f"Qdrant collection {name!r} did not exist (nothing to delete).")


if __name__ == "__main__":
    main()
