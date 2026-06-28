import asyncio
import json

import httpx

from app.main import app


def post_gp200(payload):
    async def send_request():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            return await client.post("/tone-maker/gp200", json=payload)

    return asyncio.run(send_request())


def test_headphones_keeps_amp_and_cab_enabled():
    response = post_gp200(
        {
            "tone_goal": "metal rhythm",
            "pickup_type": "humbucker bridge",
            "connection_mode": "headphones",
        }
    )

    assert response.status_code == 200
    patch = response.json()
    assert patch["device"] == "Valeton"
    assert patch["model"] == "GP-200"
    assert patch["connection_mode"] == "headphones"
    assert patch["modules"]["AMP"]["enabled"] is True
    assert patch["modules"]["CAB"]["enabled"] is True
    assert patch["valid"] is True


def test_direct_usb_keeps_amp_and_cab_enabled():
    response = post_gp200(
        {
            "tone_goal": "clean indie chorus",
            "pickup_type": "single coil neck",
            "connection_mode": "direct_usb",
        }
    )

    assert response.status_code == 200
    patch = response.json()
    assert patch["device"] == "Valeton"
    assert patch["model"] == "GP-200"
    assert patch["modules"]["AMP"]["enabled"] is True
    assert patch["modules"]["CAB"]["enabled"] is True
    assert patch["valid"] is True


def test_guitar_amp_input_disables_amp_and_cab():
    response = post_gp200(
        {
            "tone_goal": "punk rhythm",
            "pickup_type": "p90 bridge",
            "connection_mode": "guitar_amp_input",
        }
    )

    assert response.status_code == 200
    patch = response.json()
    assert patch["device"] == "Valeton"
    assert patch["model"] == "GP-200"
    assert patch["modules"]["AMP"]["enabled"] is False
    assert patch["modules"]["CAB"]["enabled"] is False
    assert "Disable AMP and CAB when feeding a guitar amp input." in patch["warnings"]
    assert patch["valid"] is True


def test_fx_return_enables_amp_and_disables_cab():
    response = post_gp200(
        {
            "tone_goal": "classic rock lead",
            "pickup_type": "humbucker bridge",
            "connection_mode": "fx_return",
        }
    )

    assert response.status_code == 200
    patch = response.json()
    assert patch["device"] == "Valeton"
    assert patch["model"] == "GP-200"
    assert patch["modules"]["AMP"]["enabled"] is True
    assert patch["modules"]["CAB"]["enabled"] is False
    assert "Disable CAB for FX return into a power amp or amp return." in patch["warnings"]
    assert patch["valid"] is True


def test_four_cable_method_disables_amp_and_cab_and_returns_routing_warning():
    response = post_gp200(
        {
            "tone_goal": "blues edge of breakup",
            "pickup_type": "single coil bridge",
            "connection_mode": "four_cable_method",
        }
    )

    assert response.status_code == 200
    patch = response.json()
    assert patch["device"] == "Valeton"
    assert patch["model"] == "GP-200"
    assert patch["modules"]["AMP"]["enabled"] is False
    assert patch["modules"]["CAB"]["enabled"] is False
    assert any("four cable method" in warning.lower() for warning in patch["warnings"])
    assert patch["summary"]
    assert patch["valid"] is True


def test_gp200_tone_maker_response_contains_no_copied_non_valeton_references():
    response = post_gp200(
        {
            "tone_goal": "metal tight rhythm",
            "pickup_type": "humbucker bridge",
            "connection_mode": "direct_usb",
        }
    )

    assert response.status_code == 200
    serialized = json.dumps(response.json())
    forbidden_references = ["Mo" + "oer", "GE " + "Labs", "GE" + "200"]
    assert not any(reference in serialized for reference in forbidden_references)


def test_gp200_tone_maker_rejects_invalid_connection_mode():
    response = post_gp200(
        {
            "tone_goal": "edge of breakup",
            "pickup_type": "single coil neck",
            "connection_mode": "bluetooth_speaker",
        }
    )

    assert response.status_code == 422


def test_gp200_tone_maker_allows_local_frontend_preflight():
    async def send_preflight():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            return await client.options(
                "/tone-maker/gp200",
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": "POST",
                },
            )

    response = asyncio.run(send_preflight())

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
