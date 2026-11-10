import fs from 'fs';

const root = new URL('../../skills/code/', import.meta.url);
const definitions = [
  { id: 'site-direction', name: 'Direção visual', stage: 'plan' },
  { id: 'site-build', name: 'Construção de sites', stage: 'build' },
  { id: 'site-review', name: 'Revisão visual', stage: 'review' },
];

export function getCodeSkills(stage) {
  return definitions.filter(skill => !stage || skill.stage === stage).map(skill => {
    const source = fs.readFileSync(new URL(`${skill.id}/SKILL.md`, root), 'utf8');
    return { ...skill, instructions: source.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, '').trim() };
  });
}

export function buildCodeSkillPrompt(stage) {
  return getCodeSkills(stage).map(skill => `[Skill: ${skill.name}]\n${skill.instructions}`).join('\n\n');
}
