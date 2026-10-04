function createLevelModal(){

  if(
    document.querySelector(
      "#levelModal"
    )
  )
    return;

  const modal =
    document.createElement(
      "div"
    );

  modal.id =
    "levelModal";

  modal.innerHTML = `

    <!-- محتوای پنجره UNLOCK LEVEL -->

  `;

  document.body.appendChild(
    modal
  );

  modal.style.display = "none";
}
