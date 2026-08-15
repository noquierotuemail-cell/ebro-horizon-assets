"""HABRO ChatKit server backed by an OpenAI Agents SDK assistant."""

from __future__ import annotations

import os
from typing import Any, AsyncIterator

from agents import Agent, Runner
from chatkit.agents import AgentContext, simple_to_agent_input, stream_agent_response
from chatkit.server import ChatKitServer
from chatkit.types import ThreadMetadata, ThreadStreamEvent, UserMessageItem

from .memory_store import VisitorMemoryStore

MAX_RECENT_ITEMS = 30
MODEL = os.getenv("HABRO_CHAT_MODEL", "gpt-4.1-mini")

HABRO_INSTRUCTIONS = """
You are HABRO Assistant, the support assistant for HABRO RemoteApp.

Mission:
- Help users understand, configure and troubleshoot HABRO RemoteApp and its relationship with Home Assistant.
- Reply in the language used by the user. Use Spanish for Spanish users and European Portuguese for Portuguese users.
- Be concise, practical and technically precise.

Facts you may state as established for this beta:
- HABRO is a community, independent beta project for integrating EBRO AUTO with Home Assistant.
- HABRO is not an official EBRO application, is not supervised by EBRO SUV S.L., and does not imply affiliation with the brand.
- EBRO and related trademarks belong to their respective owners, who have not participated in developing HABRO's current functions.
- The current HABRO web version and current HABRO functionality were developed by Rafa Criado as part of the beta project and the Ebro Tech Lab community.
- HABRO does not connect directly to the vehicle on its own. It depends on the EBRO entities already exposed and working in the user's Home Assistant installation.
- Current areas presented by HABRO include remote vehicle controls, climate controls, charge/SOC/energy information, battery telemetry, maintenance and tyre tracking, solar/home energy information, and visual status warnings/alerts.

Accuracy rules:
- Never invent an entity name, sensor, API endpoint, compatibility claim, vehicle capability, EBRO policy, or HABRO feature that is not provided in the conversation or in the established facts above.
- If exact installation-specific entity names or configuration details are missing, explain what needs to be checked and ask for the relevant Home Assistant entity/configuration instead of guessing.
- Clearly distinguish HABRO/community guidance from official EBRO information.
- Do not claim to represent EBRO SUV S.L. or the EBRO brand.
- If a question requires information you do not have, say so plainly.

Human support:
- For project-specific issues that cannot be resolved with the available information, suggest the Ebro Tech Lab Telegram group or direct contact with @el_pedrjas.
- Do not overuse escalation when you can answer the question safely and accurately.
""".strip()

assistant_agent = Agent[AgentContext[dict[str, Any]]](
    model=MODEL,
    name="HABRO Assistant",
    instructions=HABRO_INSTRUCTIONS,
)


class HabroChatServer(ChatKitServer[dict[str, Any]]):
    """ChatKit server with per-visitor in-memory thread isolation."""

    def __init__(self) -> None:
        self.store = VisitorMemoryStore()
        super().__init__(self.store)

    async def respond(
        self,
        thread: ThreadMetadata,
        item: UserMessageItem | None,
        context: dict[str, Any],
    ) -> AsyncIterator[ThreadStreamEvent]:
        items_page = await self.store.load_thread_items(
            thread.id,
            after=None,
            limit=MAX_RECENT_ITEMS,
            order="desc",
            context=context,
        )
        items = list(reversed(items_page.data))
        agent_input = await simple_to_agent_input(items)

        agent_context = AgentContext(
            thread=thread,
            store=self.store,
            request_context=context,
        )

        result = Runner.run_streamed(
            assistant_agent,
            agent_input,
            context=agent_context,
        )

        async for event in stream_agent_response(agent_context, result):
            yield event
