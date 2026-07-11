from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.algorithms import MinimumEigenOptimizer
from qiskit_algorithms import QAOA
from qiskit_algorithms.optimizers import COBYLA
from qiskit.primitives import Sampler

router = APIRouter()

class TriageRequest(BaseModel):
    patients: Dict[str, dict] # pid -> {"urgency": float, "cost": int}
    channel_budget_bytes: int

@router.post("/triage-optimize")
def triage_optimize(req: TriageRequest):
    patients = {pid: (v["urgency"], v["cost"]) for pid, v in req.patients.items()}
    qp = QuadraticProgram()
    
    for pid in patients:
        qp.binary_var(pid)

    qp.maximize(linear={pid: urgency for pid, (urgency, cost) in patients.items()})
    qp.linear_constraint(
        linear={pid: cost for pid, (urgency, cost) in patients.items()},
        sense="<=", rhs=req.channel_budget_bytes, name="channel_budget",
    )

    qaoa = QAOA(sampler=Sampler(), optimizer=COBYLA(maxiter=100), reps=2)
    result = MinimumEigenOptimizer(qaoa).solve(qp)
    
    selection = {pid: bool(val) for pid, val in zip(patients.keys(), result.x)}
    return {"selection": selection, "fval": result.fval}

class RouteRequest(BaseModel):
    edges: Dict[str, float] # edge_name -> loss_rate
    source: str
    sink: str

@router.post("/route-optimize")
def route_optimize(req: RouteRequest):
    edges = req.edges
    qp = QuadraticProgram()
    for e in edges:
        qp.binary_var(e)
    
    qp.minimize(linear={e: loss for e, loss in edges.items()})
    
    source_edges = {e: 1 for e in edges if e.startswith(f"{req.source}_")}
    if source_edges:
        qp.linear_constraint(linear=source_edges, sense="==", rhs=1, name="leave_source")

    sink_edges = {e: 1 for e in edges if e.endswith(f"_{req.sink}")}
    if sink_edges:
         qp.linear_constraint(linear=sink_edges, sense="==", rhs=1, name="enter_sink")

    qaoa = QAOA(sampler=Sampler(), optimizer=COBYLA(maxiter=100), reps=2)
    result = MinimumEigenOptimizer(qaoa).solve(qp)
    
    selection = {e: bool(val) for e, val in zip(edges.keys(), result.x)}
    return {"selection": selection, "fval": result.fval}
