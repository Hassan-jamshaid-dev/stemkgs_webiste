"""Society authz + room conflict rules."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_create_update_delete_own_society(client: TestClient, maths_user, login) -> None:
    csrf = login(maths_user)
    headers = {"X-CSRF-Token": csrf}
    r = client.post(
        "/events",
        headers=headers,
        json={
            "event_name": "pytest-own-event",
            "starts_at": "2026-01-15T10:00:00+05:00",
            "ends_at": "2026-01-15T11:00:00+05:00",
            "room": "Room Own",
            "school_year": "2025-2026",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["society"] == "maths"
    eid = body["id"]

    r = client.put(
        f"/events/{eid}",
        headers=headers,
        json={"event_name": "pytest-own-event-updated"},
    )
    assert r.status_code == 200
    assert r.json()["event_name"] == "pytest-own-event-updated"

    r = client.delete(f"/events/{eid}", headers=headers)
    assert r.status_code == 204


def test_cannot_edit_other_society_event(
    client: TestClient, maths_user, physics_user, login
) -> None:
    maths_csrf = login(maths_user)
    r = client.post(
        "/events",
        headers={"X-CSRF-Token": maths_csrf},
        json={
            "event_name": "pytest-maths-protected",
            "starts_at": "2026-02-10T10:00:00+05:00",
            "ends_at": "2026-02-10T11:00:00+05:00",
            "room": "Protected Room",
            "school_year": "2025-2026",
        },
    )
    assert r.status_code == 201, r.text
    eid = r.json()["id"]

    physics_csrf = login(physics_user)
    r = client.put(
        f"/events/{eid}",
        headers={"X-CSRF-Token": physics_csrf},
        json={"event_name": "hijack"},
    )
    assert r.status_code == 403

    r = client.delete(f"/events/{eid}", headers={"X-CSRF-Token": physics_csrf})
    assert r.status_code == 403

    # cleanup as owner (re-login — shared TestClient cookie is now physics)
    maths_csrf = login(maths_user)
    r = client.delete(f"/events/{eid}", headers={"X-CSRF-Token": maths_csrf})
    assert r.status_code == 204


def test_room_conflict_overlap_and_gap(client: TestClient, maths_user, login) -> None:
    csrf = login(maths_user)
    headers = {"X-CSRF-Token": csrf}
    r = client.post(
        "/events",
        headers=headers,
        json={
            "event_name": "pytest-conflict-a",
            "starts_at": "2026-03-01T10:00:00+05:00",
            "ends_at": "2026-03-01T11:00:00+05:00",
            "room": "Conflict Lab",
            "school_year": "2025-2026",
        },
    )
    assert r.status_code == 201, r.text
    a_id = r.json()["id"]

    # overlap
    r = client.post(
        "/events",
        headers=headers,
        json={
            "event_name": "pytest-conflict-overlap",
            "starts_at": "2026-03-01T10:30:00+05:00",
            "ends_at": "2026-03-01T11:30:00+05:00",
            "room": "conflict lab",
            "school_year": "2025-2026",
        },
    )
    assert r.status_code == 409

    # gap < 2h
    r = client.post(
        "/events",
        headers=headers,
        json={
            "event_name": "pytest-conflict-gap",
            "starts_at": "2026-03-01T12:30:00+05:00",
            "ends_at": "2026-03-01T13:30:00+05:00",
            "room": "Conflict Lab",
            "school_year": "2025-2026",
        },
    )
    assert r.status_code == 409

    # gap == 2h OK
    r = client.post(
        "/events",
        headers=headers,
        json={
            "event_name": "pytest-conflict-ok",
            "starts_at": "2026-03-01T13:00:00+05:00",
            "ends_at": "2026-03-01T14:00:00+05:00",
            "room": "Conflict Lab",
            "school_year": "2025-2026",
        },
    )
    assert r.status_code == 201, r.text
    b_id = r.json()["id"]

    client.delete(f"/events/{a_id}", headers=headers)
    client.delete(f"/events/{b_id}", headers=headers)


def test_wrong_school_year_forbidden(client: TestClient, maths_user, login) -> None:
    csrf = login(maths_user)
    r = client.post(
        "/events",
        headers={"X-CSRF-Token": csrf},
        json={
            "event_name": "pytest-old-year",
            "starts_at": "2024-09-01T10:00:00+05:00",
            "ends_at": "2024-09-01T11:00:00+05:00",
            "room": "Old",
            "school_year": "2024-2025",
        },
    )
    assert r.status_code == 403
