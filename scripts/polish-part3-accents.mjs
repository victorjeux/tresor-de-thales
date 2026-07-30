/**
 * Polissage orthographe FR pour part3 (côtés correspondants, accents).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scenesPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../client/content/part3/scenes.json',
);

let s = fs.readFileSync(scenesPath, 'utf8');

const map = [
  [
    "cotes correspondants (cotes qui jouent le meme role dans les deux triangles, car ils sont en face d'angles de meme mesure)",
    "côtés correspondants (côtés qui jouent le même rôle dans les deux triangles, car ils sont en face d'angles de même mesure)",
  ],
  [
    'cotes correspondants (cotes qui jouent le meme role)',
    'côtés correspondants (côtés qui jouent le même rôle)',
  ],
  [
    'Les longueurs des cotes correspondants sont proportionnelles',
    'Les longueurs des côtés correspondants sont proportionnelles',
  ],
  [
    'longueurs des cotes correspondants (cotes qui jouent le meme role)',
    'longueurs des côtés correspondants (côtés qui jouent le même rôle)',
  ],
  ['Moulin des Marees', 'Moulin des Marées'],
  ['roue a aube', 'roue à aube'],
  ['Roue a aube', 'Roue à aube'],
  ['Alizee', 'Alizée'],
  ['Neree', 'Nérée'],
  ['Fragments recuperes', 'Fragments récupérés'],
  ['theoreme de Thales', 'théorème de Thalès'],
  ['paralleles', 'parallèles'],
  ['deux a deux', 'deux à deux'],
  ['meme mesure', 'même mesure'],
  ['meme forme', 'même forme'],
  ['meme role', 'même rôle'],
  ['meme taille', 'même taille'],
  ['meme idee', 'même idée'],
  ['forcement', 'forcément'],
  ['egales', 'égales'],
  ['reponse', 'réponse'],
  ['modele', 'modèle'],
  ['modeles', 'modèles'],
  ['etabli', 'établi'],
  ['piece', 'pièce'],
  ['pieces', 'pièces'],
  ['troisieme', 'troisième'],
  ['defi', 'défi'],
  ['Defi', 'Défi'],
  ['reparer', 'réparer'],
  ['echelle', 'échelle'],
  ['emboite', 'emboîte'],
  ['securite', 'sécurité'],
  ['terminee', 'terminée'],
  ['Recupere', 'Récupère'],
  ['apparait', 'apparaît'],
  ['moitie', 'moitié'],
  ['donne', 'donne'],
  ['agrandissement', 'agrandissement'],
  ['reduction', 'réduction'],
  ['Reperer', 'Repérer'],
  ['Consequence', 'Conséquence'],
  ['Methode', 'Méthode'],
  ['Definition', 'Définition'],
  ['superposables', 'superposables'],
  ['differentes', 'différentes'],
  ['differents', 'différents'],
  ['necessairement', 'nécessairement'],
  ['necessaire', 'nécessaire'],
  ['automatiquement', 'automatiquement'],
  ['degres', 'degrés'],
  ['verifie', 'vérifie'],
  ['verifier', 'vérifier'],
  ['Verifier', 'Vérifier'],
  ['Controle', 'Contrôle'],
  ['Commence', 'Commence'],
  ['multipliees', 'multipliées'],
  ['manque', 'manque'],
  ['ouvert', 'ouvert'],
  ['ouverte', 'ouverte'],
  ['ile', 'île'],
  ['caches', 'cachés'],
  ['revelent', 'révèlent'],
  ['chercherons', 'chercherons'],
  ['menéra', 'mènera'],
  ['menera', 'mènera'],
];

// Longer keys first
map.sort((a, b) => b[0].length - a[0].length);
for (const [from, to] of map) {
  s = s.split(from).join(to);
}

// Validate JSON
JSON.parse(s);
fs.writeFileSync(scenesPath, s.endsWith('\n') ? s : `${s}\n`, 'utf8');

console.log('OK accents part3');
console.log(
  'côtés correspondants full:',
  s.includes(
    "côtés correspondants (côtés qui jouent le même rôle dans les deux triangles",
  ),
);
console.log('3/6:', s.includes('Fragments récupérés : 3 / 6'));
console.log('no Alizee:', !s.includes('Alizee'));
console.log('no balise/eolienne:', !/eolienne/i.test(s));
