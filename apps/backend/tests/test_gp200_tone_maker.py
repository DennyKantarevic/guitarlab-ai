import asyncio

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


def test_gp200_tone_maker_returns_valid_placeholder_patch():
    response = post_gp200(
        {
            "tone_goal": "tight modern rhythm",
            "pickup_type": "humbucker bridge",
            "connection_mode": "fx_return",
        }
    )

    assert response.status_code == 200
    patch = response.json()
    assert patch["device"] == "Mooer"
    assert patch["model"] == "GE Labs GP-200"
    assert patch["tone_goal"] == "tight modern rhythm"
    assert patch["pickup_type"] == "humbucker bridge"
    assert patch["connection_mode"] == "fx_return"
    assert patch["signal_chain"] == [
        "noise_gate",
        "drive",
        "amp",
        "cab",
        "eq",
        "delay",
        "reverb",
    ]
    assert patch["modules"]["amp"]["model"] == "US Hi Gain"
    assert patch["modules"]["cab"]["enabled"] is False
    assert "Cab disabled for FX return into a power amp or amp return." in patch["warnings"]
    assert patch["valid"] is True


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
