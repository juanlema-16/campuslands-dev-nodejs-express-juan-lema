function runTransaction(steps) {
  const applied = [];

  try {
    for (const step of steps) {
      step.run();
      applied.push(step.undo);
    }
  } catch (error) {
    for (const undo of applied.reverse()) undo?.();
    throw error;
  }
}

export { runTransaction };
