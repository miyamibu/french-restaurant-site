const COURSE_PREFIX = "コース:";

export function parseReservationNote(rawNote: string | null | undefined) {
  if (!rawNote) {
    return { course: null as string | null, note: null as string | null };
  }

  const lines = rawNote
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const courseLineIndex = lines.findIndex((line) => line.startsWith(COURSE_PREFIX));
  let course: string | null = null;

  if (courseLineIndex >= 0) {
    const courseText = lines[courseLineIndex].slice(COURSE_PREFIX.length).trim();
    course = courseText || null;
    lines.splice(courseLineIndex, 1);
  }

  const note = lines.join("\n").trim();
  return { course, note: note || null };
}
