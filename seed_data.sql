-- ============================================================
-- VETCARE PRO — Datos de Prueba (Seed)
-- 10 tutores · 20 pacientes · 50 historias clínicas
-- ============================================================

-- ─── TUTORES ─────────────────────────────────────────────────
INSERT INTO tutors (id, nombre, cedula, direccion, telefono, email) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Carlos Mendoza',      'V-10234567', 'Av. Principal, Casa 12, Los Teques',        '0412-1234567', 'carlos.mendoza@gmail.com'),
  ('a1000000-0000-0000-0000-000000000002', 'María Fernández',     'V-15678901', 'Urb. La Floresta, C/4, Qta. Rosa, Caracas', '0414-9876543', 'mfernandez@hotmail.com'),
  ('a1000000-0000-0000-0000-000000000003', 'Pedro Castillo',      'V-12345678', 'Calle Bolívar #45, Valencia',                '0424-5551234', 'pedro.castillo@yahoo.com'),
  ('a1000000-0000-0000-0000-000000000004', 'Luisa Ramírez',       'V-18901234', 'Res. El Parque, Apto 3B, Maracay',          '0416-7778899', 'luisa.ramirez@gmail.com'),
  ('a1000000-0000-0000-0000-000000000005', 'Andrés Torres',       'V-20123456', 'Sector Las Delicias, Maturín',              '0412-3334455', 'andres.torres@gmail.com'),
  ('a1000000-0000-0000-0000-000000000006', 'Gabriela Suárez',     'V-16789012', 'Av. Libertador, Torre B, Piso 5, Caracas',  '0414-2223344', 'gsuarez@outlook.com'),
  ('a1000000-0000-0000-0000-000000000007', 'Roberto Herrera',     'V-13456789', 'Urb. Caña de Azúcar, Maracaibo',            '0261-5556677', 'roberto.herrera@gmail.com'),
  ('a1000000-0000-0000-0000-000000000008', 'Ana Martínez',        'V-19012345', 'C/Las Palmas, Casa 7, Barquisimeto',        '0251-4445566', 'ana.martinez@gmail.com'),
  ('a1000000-0000-0000-0000-000000000009', 'José Morales',        'V-11234567', 'Av. Universidad, Edif. Sol, PB, Mérida',   '0274-3334455', 'jose.morales@hotmail.com'),
  ('a1000000-0000-0000-0000-000000000010', 'Valentina Díaz',      'V-22345678', 'Urb. Santa Eduvigis, Qta. Lis, Caracas',   '0412-8889900', 'vdiaz@gmail.com');

-- ─── PACIENTES ───────────────────────────────────────────────
INSERT INTO patients (id, tutor_id, nombre, especie, raza, fecha_nacimiento, color, sexo) VALUES
  -- Carlos Mendoza
  ('b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Max',      'Canino', 'Pastor Alemán',    '2019-03-15', 'Negro y marrón',  'Macho'),
  ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Luna',     'Felino', 'Persa',            '2021-07-20', 'Blanco',          'Hembra'),
  -- María Fernández
  ('b2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'Coco',     'Canino', 'Golden Retriever', '2020-01-10', 'Dorado',          'Macho'),
  ('b2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'Mia',      'Felino', 'Siamés',           '2022-05-18', 'Crema y marrón',  'Hembra'),
  -- Pedro Castillo
  ('b2000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003', 'Rocky',    'Canino', 'Bulldog Francés',  '2021-11-03', 'Atigrado',        'Macho'),
  ('b2000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003', 'Nala',     'Canino', 'Labrador',         '2018-08-22', 'Amarillo',        'Hembra'),
  -- Luisa Ramírez
  ('b2000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000004', 'Simba',    'Felino', 'Maine Coon',       '2020-04-14', 'Naranja atigrado','Macho'),
  ('b2000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000004', 'Bella',    'Canino', 'Shih Tzu',         '2023-02-28', 'Blanco y negro',  'Hembra'),
  -- Andrés Torres
  ('b2000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000005', 'Duke',     'Canino', 'Rottweiler',       '2019-09-07', 'Negro y fuego',   'Macho'),
  ('b2000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000005', 'Kira',     'Canino', 'Husky Siberiano',  '2021-12-01', 'Blanco y gris',   'Hembra'),
  -- Gabriela Suárez
  ('b2000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000006', 'Oliver',   'Felino', 'British Shorthair','2020-06-15', 'Gris azulado',    'Macho'),
  ('b2000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000006', 'Lola',     'Canino', 'Beagle',           '2022-03-09', 'Tricolor',        'Hembra'),
  -- Roberto Herrera
  ('b2000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000007', 'Thor',     'Canino', 'Doberman',         '2020-10-20', 'Negro y fuego',   'Macho'),
  ('b2000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000007', 'Pelusa',   'Felino', 'Angora',           '2021-01-30', 'Blanco',          'Hembra'),
  -- Ana Martínez
  ('b2000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000008', 'Toby',     'Canino', 'Yorkshire Terrier','2022-08-12', 'Marrón y dorado', 'Macho'),
  ('b2000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000008', 'Mimi',     'Felino', 'Ragdoll',          '2020-11-25', 'Bicolor',         'Hembra'),
  -- José Morales
  ('b2000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000009', 'Rex',      'Canino', 'Border Collie',    '2019-05-18', 'Negro y blanco',  'Macho'),
  ('b2000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000009', 'Canela',   'Canino', 'Cocker Spaniel',   '2021-03-22', 'Canela',          'Hembra'),
  -- Valentina Díaz
  ('b2000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000010', 'Bono',     'Canino', 'Maltés',           '2023-01-05', 'Blanco',          'Macho'),
  ('b2000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000010', 'Nube',     'Felino', 'Europeo Común',    '2022-09-14', 'Gris',            'Hembra');

-- ─── HISTORIAS CLÍNICAS ──────────────────────────────────────
INSERT INTO medical_records (
  patient_id, numero_historia, fecha_consulta,
  motivo_consulta, f_respiratoria, f_cardiaca, temperatura, pulso,
  tiempo_llenado_capilar, ganglios_linfaticos, mucosas, actitud_temperamento,
  ultima_desparasitacion, vacunas, alimentacion, historial_reproductivo,
  sistemas_status, descripcion_hallazgos
) VALUES

-- MAX (Pastor Alemán)
('b2000000-0000-0000-0000-000000000001', 'HC-2026-0003', '2026-01-10 09:00:00',
 'Control anual y vacunación', '22', '75', 38.4, 'Fuerte y regular', '< 2 seg', 'No palpables', 'Rosadas húmedas', 'Alerta',
 '01/10/2025 — Ivermectina 1%', '10/01/2026 — Vanguard Plus — Lote VG2201',
 'Croquetas Royal Canin Pastor Alemán 2x/día', 'Esterilizado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 NULL),

('b2000000-0000-0000-0000-000000000001', 'HC-2026-0004', '2026-03-05 10:30:00',
 'Cojera en miembro posterior derecho, 3 días de evolución', '24', '82', 38.8, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas húmedas', 'Alerta',
 '01/10/2025 — Ivermectina 1%', '10/01/2026 — Vanguard Plus — Lote VG2201',
 'Croquetas Royal Canin 2x/día', 'Esterilizado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"AN","cardiovascular":"N","genitourinario":"N"}',
 'Musculoesquelético: Dolor a la palpación en articulación coxofemoral derecha. Posible displasia. Se recomienda radiografía.'),

-- LUNA (Persa)
('b2000000-0000-0000-0000-000000000002', 'HC-2026-0005', '2026-01-20 11:00:00',
 'Dermatitis, pérdida de pelo en zona lumbar', '28', '140', 38.6, 'Débil', '2 seg', 'No palpables', 'Rosadas', 'Letárgico',
 '15/11/2025 — Drontal Gatos', '20/01/2026 — Felocell — Lote FC2101',
 'Purina Pro Plan Felino 3x/día', 'Esterilizado/a',
 '{"estado_general":"AN","hidratacion":"N","tegumentario":"AN","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 'Estado general comprometido. Tegumentario: alopecia simétrica bilateral en región lumbar, piel eritematosa con descamación. Se inicia tratamiento con prednisolona.'),

-- COCO (Golden Retriever)
('b2000000-0000-0000-0000-000000000003', 'HC-2026-0006', '2026-02-14 08:30:00',
 'Vómitos y diarrea desde hace 2 días', '26', '90', 39.2, 'Fuerte', '2 seg', 'No palpables', 'Pálidas', 'Letárgico',
 '20/12/2025 — Milbemax', '14/02/2026 — Nobivac DHPPi — Lote ND2202',
 'Hills Science Diet Adulto', 'Entero/a',
 '{"estado_general":"AN","hidratacion":"AN","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"AN","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 'Deshidratación estimada 7-8%. Digestivo: dolor a la palpación abdominal difusa, borborigmos aumentados. Se instaura fluidoterapia IV.'),

('b2000000-0000-0000-0000-000000000003', 'HC-2026-0007', '2026-02-21 09:00:00',
 'Control post-tratamiento gastroenteritis', '22', '80', 38.5, 'Fuerte y regular', '< 2 seg', 'No palpables', 'Rosadas húmedas', 'Alerta',
 '20/12/2025 — Milbemax', '14/02/2026 — Nobivac DHPPi — Lote ND2202',
 'Dieta blanda: arroz con pollo en transición', 'Entero/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 NULL),

-- MIA (Siamés)
('b2000000-0000-0000-0000-000000000004', 'HC-2026-0008', '2026-01-08 14:00:00',
 'Otitis, sacude cabeza constantemente', '30', '150', 38.9, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Alerta',
 '10/10/2025 — Drontal Gatos', '08/01/2026 — Felocell 4 — Lote FC2102',
 'Whiskas Adulto Esterilizado', 'Esterilizado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"AN","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 'Oídos: conducto auditivo externo bilateral con exudado marrón oscuro de olor fétido, prurito intenso. Otoscopia: tímpano íntegro. Tratamiento: Otomax 7 días.'),

-- ROCKY (Bulldog Francés)
('b2000000-0000-0000-0000-000000000005', 'HC-2026-0009', '2026-03-01 10:00:00',
 'Dificultad respiratoria, ronquidos aumentados', '32', '110', 38.7, 'Regular', '2 seg', 'No palpables', 'Cianóticas leve', 'Ansioso',
 '15/01/2026 — Bravecto', '01/03/2026 — Vanguard 5 — Lote VA2203',
 'Croquetas Bulldog French Royal Canin', 'Castrado/a',
 '{"estado_general":"AN","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"AN","respiratorio":"AN","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","digestivo":"N","genitourinario":"N"}',
 'Síndrome braquicefálico severo. Nariz: narinas estenóticas grado II. Respiratorio: estridor inspiratorio marcado. Se recomienda corrección quirúrgica.'),

('b2000000-0000-0000-0000-000000000005', 'HC-2026-0010', '2026-04-10 09:30:00',
 'Control post-operatorio rinoplasmia', '24', '95', 38.4, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Alerta',
 '15/01/2026 — Bravecto', '01/03/2026 — Vanguard 5 — Lote VA2203',
 'Dieta blanda post-quirúrgica', 'Castrado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","digestivo":"N","genitourinario":"N"}',
 NULL),

-- NALA (Labrador)
('b2000000-0000-0000-0000-000000000006', 'HC-2026-0011', '2026-01-15 11:30:00',
 'Revisión masa en mama derecha', '20', '72', 38.3, 'Fuerte y regular', '< 2 seg', 'Palpables aumentados axilares', 'Rosadas', 'Alerta',
 '05/11/2025 — Ivermectina', '15/01/2026 — Nobivac — Lote ND2101',
 'Purina Pro Plan Senior', 'Entera/o',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"AN","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"AN"}',
 'Tegumentario: masa de 2x3 cm en 4ta mama derecha, consistencia firme, no adherida. Ganglios axilares reactivos. Se recomienda citología y mastectomía.'),

-- SIMBA (Maine Coon)
('b2000000-0000-0000-0000-000000000007', 'HC-2026-0012', '2026-02-03 16:00:00',
 'No come desde hace 3 días, decaído', '36', '160', 40.1, 'Débil', '3 seg', 'No palpables', 'Pálidas', 'Letárgico',
 '20/09/2025 — Drontal', '03/02/2026 — Felocell — Lote FC2103',
 'Whiskas húmedo', 'Entero/a',
 '{"estado_general":"AN","hidratacion":"AN","tegumentario":"N","ojos":"AN","oidos":"N","nariz":"AN","digestivo":"AN","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 'Fiebre 40.1°C. Ojos: secreción serosa bilateral. Nariz: secreción mucopurulenta. Digestivo: anorexia. Cuadro compatible con Panleucopenia. Hospitalización urgente.'),

-- BELLA (Shih Tzu)
('b2000000-0000-0000-0000-000000000008', 'HC-2026-0013', '2026-03-18 10:00:00',
 'Primera consulta, vacunación cachorro', '28', '120', 38.6, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Hiperactivo',
 'No aplica — primer esquema', 'Inicio esquema vacunal',
 'Royal Canin Starter 4x/día', 'Entera/o',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 NULL),

('b2000000-0000-0000-0000-000000000008', 'HC-2026-0014', '2026-04-18 10:00:00',
 'Segunda vacuna y desparasitación', '26', '115', 38.5, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Alerta',
 '18/03/2026 — Drontal Puppy', '18/04/2026 — Vanguard 5 — Lote VA2204',
 'Royal Canin Junior Shih Tzu', 'Entera/o',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 NULL),

-- DUKE (Rottweiler)
('b2000000-0000-0000-0000-000000000009', 'HC-2026-0015', '2026-01-22 08:00:00',
 'Convulsiones episódicas, 2 episodios en última semana', '22', '88', 38.6, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Alerta',
 '10/10/2025 — Ivermectina', '22/01/2026 — Nobivac DHPPi — Lote ND2201',
 'Croquetas Rottweiler Royal Canin', 'Esterilizado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"AN","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 'Nervioso: interictalmente sin déficits neurológicos. Reflejos normales. Epilepsia idiopática probable. Inicio Fenobarbital 2.5 mg/kg BID. Control en 30 días.'),

('b2000000-0000-0000-0000-000000000009', 'HC-2026-0016', '2026-02-22 09:00:00',
 'Control epilepsia. Refiere 0 episodios en el mes', '20', '80', 38.3, 'Fuerte y regular', '< 2 seg', 'No palpables', 'Rosadas', 'Alerta',
 '10/10/2025 — Ivermectina', '22/01/2026 — Nobivac DHPPi — Lote ND2201',
 'Croquetas Rottweiler Royal Canin', 'Esterilizado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 NULL),

-- KIRA (Husky)
('b2000000-0000-0000-0000-000000000010', 'HC-2026-0017', '2026-03-10 11:00:00',
 'Celo y consulta sobre esterilización', '22', '85', 38.4, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Alerta',
 '20/11/2025 — Milbemax', '10/03/2026 — Nobivac — Lote ND2302',
 'Croquetas Husky Royal Canin', 'Entera/o',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 NULL),

-- OLIVER (British Shorthair)
('b2000000-0000-0000-0000-000000000011', 'HC-2026-0018', '2026-02-08 15:00:00',
 'Obesidad, control de peso', '30', '155', 38.7, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Letárgico',
 '01/12/2025 — Drontal Gatos', '08/02/2026 — Felocell — Lote FC2201',
 'Purina One Adulto — sin restricción hasta ahora', 'Esterilizado/a',
 '{"estado_general":"AN","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"AN","cardiovascular":"N","genitourinario":"N"}',
 'Condición corporal 8/9. Sobrepeso severo (6.8 kg, ideal 4.5 kg). Musculoesquelético: leve dificultad para saltar. Dieta Hills Metabolic + restricción calórica. Control mensual.'),

-- LOLA (Beagle)
('b2000000-0000-0000-0000-000000000012', 'HC-2026-0019', '2026-01-30 09:30:00',
 'Conjuntivitis, ojos rojos y lagrimeo', '24', '88', 38.5, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Alerta',
 '15/10/2025 — Bravecto Spot On', '30/01/2026 — Nobivac — Lote ND2102',
 'Croquetas Beagle Pro Plan', 'Entera/o',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"AN","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 'Ojos: hiperemia conjuntival bilateral, epífora moderada, secreción serosa. Sin úlcera corneal en tinción con fluoresceína. Tratamiento: Tobradex colirio 5 días.'),

-- THOR (Doberman)
('b2000000-0000-0000-0000-000000000013', 'HC-2026-0020', '2026-04-02 08:30:00',
 'Control cardiológico anual', '20', '68', 38.2, 'Fuerte y regular', '< 2 seg', 'No palpables', 'Rosadas', 'Alerta',
 '02/01/2026 — Ivermectina', '02/04/2026 — Nobivac — Lote ND2401',
 'Hills Heart Care Adulto', 'Esterilizado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"AN","genitourinario":"N"}',
 'Cardiovascular: soplo sistólico grado II/VI en foco mitral. Ritmo regular. Se solicita ecocardiograma. Predisposición racial a MCD.'),

-- PELUSA (Angora)
('b2000000-0000-0000-0000-000000000014', 'HC-2026-0021', '2026-03-25 14:30:00',
 'No usa caja de arena, orina fuera', '32', '160', 38.8, 'Débil', '2 seg', 'No palpables', 'Rosadas', 'Ansioso',
 '10/01/2026 — Drontal', '25/03/2026 — Felocell — Lote FC2301',
 'Whiskas Adulto', 'Esterilizado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"AN"}',
 'Genitourinario: dolor a la palpación vesical, hematuria macroscópica. Posible FLUTD. Urianálisis: pH 6.5, cristales de estruvita. Dieta urinary + aumento ingesta hídrica.'),

-- TOBY (Yorkshire)
('b2000000-0000-0000-0000-000000000015', 'HC-2026-0022', '2026-02-18 10:00:00',
 'Dental, mal aliento y dificultad para comer', '26', '115', 38.6, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas pálidas', 'Alerta',
 '18/11/2025 — Milbemax', '18/02/2026 — Vanguard 5 — Lote VA2202',
 'Hills Oral Care miniatura', 'Esterilizado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"AN","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 'Digestivo: halitosis severa, sarro grado III, gingivitis generalizada, 2 piezas con movilidad grado II. Se programa profilaxis dental bajo anestesia.'),

('b2000000-0000-0000-0000-000000000015', 'HC-2026-0023', '2026-03-05 09:00:00',
 'Control post-profilaxis dental', '24', '110', 38.4, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Alerta',
 '18/11/2025 — Milbemax', '18/02/2026 — Vanguard 5 — Lote VA2202',
 'Hills Oral Care miniatura', 'Esterilizado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 NULL),

-- MIMI (Ragdoll)
('b2000000-0000-0000-0000-000000000016', 'HC-2026-0024', '2026-04-15 11:00:00',
 'Control anual, paciente sana', '28', '145', 38.5, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Alerta',
 '15/01/2026 — Drontal Gatos', '15/04/2026 — Felocell 4 — Lote FC2401',
 'Purina Pro Plan Sterilised', 'Esterilizado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 NULL),

-- REX (Border Collie)
('b2000000-0000-0000-0000-000000000017', 'HC-2026-0025', '2026-01-28 08:00:00',
 'Laceración en almohadilla, pisó vidrio', '22', '80', 38.4, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Alerta',
 '28/10/2025 — Ivermectina', '28/01/2026 — Nobivac — Lote ND2102',
 'Eukanuba Adulto Raza Mediana', 'Esterilizado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"AN","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 'Tegumentario: laceración de 1.5 cm en almohadilla plantar posterior derecha, profundidad media, sin afectación tendinosa. Limpieza, sutura 3 puntos, antibiótico 7 días.'),

('b2000000-0000-0000-0000-000000000017', 'HC-2026-0026', '2026-02-11 09:00:00',
 'Retiro de puntos almohadilla', '22', '78', 38.3, 'Fuerte y regular', '< 2 seg', 'No palpables', 'Rosadas', 'Alerta',
 '28/10/2025 — Ivermectina', '28/01/2026 — Nobivac — Lote ND2102',
 'Eukanuba Adulto Raza Mediana', 'Esterilizado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 NULL),

-- CANELA (Cocker)
('b2000000-0000-0000-0000-000000000018', 'HC-2026-0027', '2026-03-20 14:00:00',
 'Otitis crónica recurrente', '24', '90', 38.7, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Ansioso',
 '20/12/2025 — Milbemax', '20/03/2026 — Nobivac — Lote ND2303',
 'Hills Science Diet Cocker', 'Esterilizado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"AN","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 'Oídos: otitis externa bilateral crónica. CAE con exudado oscuro abundante, eritema marcado, prurito ++. Cultivo anterior: Malassezia. Tratamiento: Posatex 7 días + limpieza diaria.'),

('b2000000-0000-0000-0000-000000000018', 'HC-2026-0028', '2026-04-20 14:00:00',
 'Control otitis post-tratamiento', '22', '85', 38.4, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Alerta',
 '20/12/2025 — Milbemax', '20/03/2026 — Nobivac — Lote ND2303',
 'Hills Science Diet Cocker', 'Esterilizado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 NULL),

-- BONO (Maltés)
('b2000000-0000-0000-0000-000000000019', 'HC-2026-0029', '2026-04-05 10:30:00',
 'Primera consulta cachorro, revisión general', '32', '130', 38.8, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Hiperactivo',
 'No aplica', 'Inicio esquema — 1ra dosis aplicada hoy',
 'Royal Canin Mini Puppy 4x/día', 'Entero/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 NULL),

-- NUBE (Europeo Común)
('b2000000-0000-0000-0000-000000000020', 'HC-2026-0030', '2026-02-26 16:30:00',
 'Esterilización electiva', '30', '155', 38.6, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Alerta',
 '26/11/2025 — Drontal', '26/02/2026 — Felocell — Lote FC2202',
 'Purina One Adulto', 'Entera/o',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 NULL),

('b2000000-0000-0000-0000-000000000020', 'HC-2026-0031', '2026-03-12 10:00:00',
 'Control post-ovariohisterectomía, retiro de puntos', '28', '145', 38.5, 'Fuerte', '< 2 seg', 'No palpables', 'Rosadas', 'Alerta',
 '26/11/2025 — Drontal', '26/02/2026 — Felocell — Lote FC2202',
 'Purina One Esterilizado', 'Esterilizado/a',
 '{"estado_general":"N","hidratacion":"N","tegumentario":"N","ojos":"N","oidos":"N","nariz":"N","digestivo":"N","respiratorio":"N","nervioso":"N","musculoesqueletico":"N","cardiovascular":"N","genitourinario":"N"}',
 NULL);

-- Verificar inserción
SELECT
  COUNT(DISTINCT t.id)  AS total_tutores,
  COUNT(DISTINCT p.id)  AS total_pacientes,
  COUNT(DISTINCT mr.id) AS total_historias
FROM tutors t
LEFT JOIN patients p ON p.tutor_id = t.id
LEFT JOIN medical_records mr ON mr.patient_id = p.id;
