// const form = document.getElementById("registerForm");

// form.addEventListener('submit', e =>{
//     e.preventDefault()
//     const data = new FormData(form)
//     const obj = {}
//     data.forEach((value,key)=>obj[key]=value)
//     fetch('/api/jwt/register', {
//         method:"POST",
//         body: JSON.stringify(obj),
//         headers:{
//             'Content-Type': 'application/json'
//         }
//     })
//     .then(result =>{
//         if(result.status === 200){
//             window.location.replace("/users/login")
//         }
//     })
// })


const form = document.getElementById("registerForm");
form.addEventListener('submit', function(event) {
  event.preventDefault();

  const formData = new FormData(form);

  console.log("FORM: ", form)
  fetch('/api/jwt/register', {
    method: "POST",
    body: formData, 
  })
  .then(result => {
    if(result.status === 200){
      window.location.replace("/users/login")
    }
  })
});