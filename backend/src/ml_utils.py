import time
import functools
import logging

logger = logging.getLogger(__name__)

class Profiler:
    """Tracks execution time of functions for performance monitoring."""
    
    _metrics = {}

    @classmethod
    def profile(cls, name=None):
        def decorator(func):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                metric_name = name or func.__name__
                start_time = time.perf_counter()
                try:
                    result = func(*args, **kwargs)
                    return result
                finally:
                    end_time = time.perf_counter()
                    duration = end_time - start_time
                    if metric_name not in cls._metrics:
                        cls._metrics[metric_name] = []
                    cls._metrics[metric_name].append(duration)
                    logger.debug(f"[PROFILER] {metric_name} took {duration:.4f}s")
            return wrapper
        return decorator

    @classmethod
    def get_metrics(cls):
        """Returns average execution times for all profiled functions."""
        summary = {}
        for name, times in cls._metrics.items():
            if times:
                summary[name] = sum(times) / len(times)
        return summary
    
    @classmethod
    def clear(cls):
        cls._metrics.clear()
