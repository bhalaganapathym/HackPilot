import uuid

from fastapi.testclient import TestClient

from app.auth import CurrentUser, get_current_user, get_optional_current_user
from app.main import app


client = TestClient(app)


def _auth_user(label: str) -> CurrentUser:
    return CurrentUser(
        supabase_user_id=f"test-{label}-{uuid.uuid4()}",
        email=f"{label}-{uuid.uuid4()}@example.com",
    )


def _set_auth(user: CurrentUser | None):
    app.dependency_overrides.clear()
    if user:
        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_optional_current_user] = lambda: user
    else:
        app.dependency_overrides[get_optional_current_user] = lambda: None


def _create_profile(label: str, username: str) -> CurrentUser:
    user = _auth_user(label)
    _set_auth(user)
    res = client.put("/api/me/profile", json={
        "name": label.title(),
        "username": username,
        "bio": "Building with HackPilot.",
        "linkedin_url": None,
        "github_url": "https://github.com/example",
    })
    assert res.status_code == 200
    return user


def test_profile_provision_update_and_public_read():
    user = _create_profile("alpha", f"alpha-{uuid.uuid4().hex[:8]}")

    me = client.get("/api/me")
    assert me.status_code == 200
    data = me.json()
    assert data["supabase_user_id"] == user.supabase_user_id
    assert data["email"] == user.email
    assert data["gamification"]["total_xp"] == 0

    _set_auth(None)
    public = client.get(f"/api/u/{data['username']}")
    assert public.status_code == 200
    assert public.json()["email"] is None


def test_duplicate_username_rejected():
    username = f"taken-{uuid.uuid4().hex[:8]}"
    _create_profile("first", username)
    second = _auth_user("second")
    _set_auth(second)

    res = client.put("/api/me/profile", json={
        "name": "Second",
        "username": username,
        "bio": "",
        "linkedin_url": None,
        "github_url": None,
    })
    assert res.status_code == 409


def test_follow_unfollow_and_friends_leaderboard():
    username_a = f"pilot-a-{uuid.uuid4().hex[:8]}"
    username_b = f"pilot-b-{uuid.uuid4().hex[:8]}"
    user_a = _create_profile("pilot a", username_a)
    user_b = _create_profile("pilot b", username_b)

    _set_auth(user_a)
    follow = client.post(f"/api/u/{username_b}/follow")
    assert follow.status_code == 200
    assert follow.json()["relationship"] == "following"
    global_board = client.get("/api/leaderboard?scope=global")
    assert global_board.status_code == 200
    relationships = {
        entry["user"]["username"]: entry["relationship"]
        for entry in global_board.json()["entries"]
    }
    assert relationships[username_b] == "following"

    _set_auth(user_b)
    back = client.post(f"/api/u/{username_a}/follow")
    assert back.status_code == 200
    assert back.json()["relationship"] == "friends"

    friends = client.get("/api/leaderboard?scope=friends")
    assert friends.status_code == 200
    names = {entry["user"]["username"] for entry in friends.json()["entries"]}
    assert username_a in names
    assert username_b in names
    friend_relationships = {
        entry["user"]["username"]: entry["relationship"]
        for entry in friends.json()["entries"]
    }
    assert friend_relationships[username_a] == "friends"

    unfollow = client.delete(f"/api/u/{username_a}/follow")
    assert unfollow.status_code == 200
    assert unfollow.json()["relationship"] == "follow"


def test_self_follow_rejected():
    username = f"self-{uuid.uuid4().hex[:8]}"
    user = _create_profile("self", username)
    _set_auth(user)

    res = client.post(f"/api/u/{username}/follow")
    assert res.status_code == 400
