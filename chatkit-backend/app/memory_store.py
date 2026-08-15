"""In-memory ChatKit store with per-visitor isolation for the HABRO beta."""

from __future__ import annotations

from collections import defaultdict

from chatkit.store import NotFoundError, Store
from chatkit.types import Attachment, Page, ThreadItem, ThreadMetadata


class VisitorMemoryStore(Store[dict]):
    """
    Minimal beta store.

    Conversation data is isolated by the anonymous visitor ID injected by the
    HABRO edge Worker. Data is intentionally ephemeral and resets when the
    backend process restarts. Replace this store with durable persistence before
    relying on long-term conversation history.
    """

    def __init__(self):
        self.threads: dict[str, ThreadMetadata] = {}
        self.items: dict[str, list[ThreadItem]] = defaultdict(list)
        self.thread_owners: dict[str, str] = {}

    def _visitor(self, context: dict) -> str:
        visitor = str(context.get("visitor_id") or "").strip()
        if not visitor:
            raise NotFoundError("Visitor context is missing")
        return visitor

    def _assert_owner(self, thread_id: str, context: dict) -> str:
        visitor = self._visitor(context)
        if self.thread_owners.get(thread_id) != visitor:
            raise NotFoundError(f"Thread {thread_id} not found")
        return visitor

    async def load_thread(self, thread_id: str, context: dict) -> ThreadMetadata:
        self._assert_owner(thread_id, context)
        if thread_id not in self.threads:
            raise NotFoundError(f"Thread {thread_id} not found")
        return self.threads[thread_id]

    async def save_thread(self, thread: ThreadMetadata, context: dict) -> None:
        visitor = self._visitor(context)
        existing_owner = self.thread_owners.get(thread.id)
        if existing_owner is not None and existing_owner != visitor:
            raise NotFoundError(f"Thread {thread.id} not found")
        self.thread_owners[thread.id] = visitor
        self.threads[thread.id] = thread

    async def load_threads(
        self, limit: int, after: str | None, order: str, context: dict
    ) -> Page[ThreadMetadata]:
        visitor = self._visitor(context)
        threads = [
            thread
            for thread in self.threads.values()
            if self.thread_owners.get(thread.id) == visitor
        ]
        return self._paginate(
            threads,
            after,
            limit,
            order,
            sort_key=lambda thread: thread.created_at,
            cursor_key=lambda thread: thread.id,
        )

    async def load_thread_items(
        self, thread_id: str, after: str | None, limit: int, order: str, context: dict
    ) -> Page[ThreadItem]:
        self._assert_owner(thread_id, context)
        items = self.items.get(thread_id, [])
        return self._paginate(
            items,
            after,
            limit,
            order,
            sort_key=lambda item: item.created_at,
            cursor_key=lambda item: item.id,
        )

    async def add_thread_item(
        self, thread_id: str, item: ThreadItem, context: dict
    ) -> None:
        self._assert_owner(thread_id, context)
        self.items[thread_id].append(item)

    async def save_item(self, thread_id: str, item: ThreadItem, context: dict) -> None:
        self._assert_owner(thread_id, context)
        items = self.items[thread_id]
        for index, existing in enumerate(items):
            if existing.id == item.id:
                items[index] = item
                return
        items.append(item)

    async def load_item(
        self, thread_id: str, item_id: str, context: dict
    ) -> ThreadItem:
        self._assert_owner(thread_id, context)
        for item in self.items.get(thread_id, []):
            if item.id == item_id:
                return item
        raise NotFoundError(f"Item {item_id} not found in thread {thread_id}")

    async def delete_thread(self, thread_id: str, context: dict) -> None:
        self._assert_owner(thread_id, context)
        self.threads.pop(thread_id, None)
        self.items.pop(thread_id, None)
        self.thread_owners.pop(thread_id, None)

    async def delete_thread_item(
        self, thread_id: str, item_id: str, context: dict
    ) -> None:
        self._assert_owner(thread_id, context)
        self.items[thread_id] = [
            item for item in self.items.get(thread_id, []) if item.id != item_id
        ]

    def _paginate(
        self,
        rows: list,
        after: str | None,
        limit: int,
        order: str,
        sort_key,
        cursor_key,
    ):
        sorted_rows = sorted(rows, key=sort_key, reverse=order == "desc")
        start = 0
        if after:
            for index, row in enumerate(sorted_rows):
                if cursor_key(row) == after:
                    start = index + 1
                    break
        data = sorted_rows[start : start + limit]
        has_more = start + limit < len(sorted_rows)
        next_after = cursor_key(data[-1]) if has_more and data else None
        return Page(data=data, has_more=has_more, after=next_after)

    async def save_attachment(self, attachment: Attachment, context: dict) -> None:
        raise NotImplementedError("Attachments are disabled in HABRO ChatKit v1")

    async def load_attachment(self, attachment_id: str, context: dict) -> Attachment:
        raise NotImplementedError("Attachments are disabled in HABRO ChatKit v1")

    async def delete_attachment(self, attachment_id: str, context: dict) -> None:
        raise NotImplementedError("Attachments are disabled in HABRO ChatKit v1")
