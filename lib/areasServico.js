// Áreas de atuação que o prestador escolhe no cadastro.
export const AREAS_SERVICO = [
  'Pintura', 'Piso e revestimento', 'Elétrica', 'Hidráulica', 'Gesso e drywall', 'Alvenaria e reboco',
  'Marcenaria e planejados', 'Serralheria e vidraçaria', 'Telhado e impermeabilização', 'Ar-condicionado',
  'Limpeza e faxina', 'Jardinagem', 'Dedetização', 'Persianas e cortinas', 'Reparos gerais', 'Outros',
];
export const limparAreas = (v) => (Array.isArray(v) ? [...new Set(v.map(String).filter((a) => AREAS_SERVICO.includes(a)))] : []);
