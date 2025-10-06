export function capitalizarNome(nome) {
  if (!nome) return nome;

  return nome
    .toLowerCase() 
    .split(' ') 
    .filter(palavra => palavra.trim() !== '') 
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(' ');
}
