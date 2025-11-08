import os
import multiprocessing as mp
from multiprocessing import Queue, Process


# HID Thread
def hid(q):
    os.sched_setaffinity(0, {0})
    while True:
        msg = q.get()
        print(f"[HID] Got message: {msg}")


# Pairing Thread


def pair(q):
    os.sched_setaffinity(0, {1})


# Polling Thread
def poll(q):
    os.sched_setaffinity(0, {2})
    while True:
        for i in range(10):
            q.put(f"msg[{i}]")


if __name__ == "__main__":
    mp.set_start_method("fork")
    q = Queue()
    p1 = Process(target=hid, args=(q,))
    p2 = Process(target=hid, args=(q,))
    p1.start()
    p2.start()
