from uuid import uuid4


def income_id() -> str:
    return f"income_{uuid4().hex[:12]}"

def expense_id() -> str:
    return f"expense_{uuid4().hex[:12]}"

def expense_category_id() -> str:
    return f"expense_cat_{uuid4().hex[:10]}"

def fixed_expense_id() -> str:
    return f"fixed_expense_{uuid4().hex[:10]}"

def saving_goal_id() -> str:
    return f"saving_goal_{uuid4().hex[:10]}"

def bank_loan_id() -> str:
    return f"bank_loan_{uuid4().hex[:10]}"

def income_source_id() -> str:
    return f"income_source_{uuid4().hex[:10]}"
