const highlightBattleText = (text = '') =>
  text
    .replace(
      /(recibe daño)/gi,
      '<span class="text-red-400 font-semibold">$1</span>'
    )
    .replace(
      /(bloquea el ataque)/gi,
      '<span class="text-green-400 font-semibold">$1</span>'
    )
    .replace(
      /(resiste el ataque|resiste el daño)/gi,
      '<span class="text-blue-400 font-semibold">$1</span>'
    )
    .replace(
      /(contraataca)/gi,
      '<span class="text-yellow-400 font-semibold">$1</span>'
    );

export default highlightBattleText;
