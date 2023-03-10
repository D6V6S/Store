// console.log("nav.js")

document.querySelector('.close-nav').onclick= closeNav;
document.querySelector('.show-nav').onclick= showNav;

function closeNav(){
    document.querySelector('.site-nav').style.left = '-300px';
}

function showNav(){
    document.querySelector('.site-nav').style.left = '0px';
}

function getCategoryList(){
    fetch('/get-category-list',
    {
        method:"POST"
    }).then( function(response){
        return response.text();
    }).then(function(body){
        // console.log(body);
        showCategoryList(JSON.parse(body));
    })
}

function showCategoryList(data){
    // console.log(data)
    let out =`<ul class="category-list"><li><a href="/">Main</a></li>`;
    for (const element of data){
        out +=`<li><a href="/cat?id=${element['id']}">${element['category']}</a></li>`;
    }
    // 
    out += '</ul>';
    document.querySelector('#category-list').innerHTML = out;
}

getCategoryList();