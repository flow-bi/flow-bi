from .runtime import WorkerRuntime, WorkerTaskRuntime, prepare_worker_runtime

__all__ = (
    "WorkerRuntime",
    "WorkerTaskRuntime",
    "prepare_worker_runtime",
)


def __getattr__(name: str):
    """Keep the old adapter importable until the Harness gateway moves to runtime."""
    if name == "execute_worker":
        from .runner import execute_worker
        return execute_worker
    if name == "parse_invocation":
        from .invocation import parse_invocation
        return parse_invocation
    raise AttributeError(name)
