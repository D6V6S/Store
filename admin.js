module.exports = function(req, res, con, next){
    // console.log('Cookies: ', req.cookies);
    // console.log('HASH: ', req.cookies.hash);
    if (req.cookies.id == undefined || req.cookies.hash == undefined) {
        console.log('ERROR User not found');
        res.redirect('/login');
        return false;
    };
    con.query(
        `SELECT * FROM user WHERE id='${req.cookies.id}' AND hash='${req.cookies.hash}'`,
        function (error, result) {
        if (error) reject(error);
        if (result.length == 0) {
            console.log('ERROR User not found');
            res.redirect('/login');
        } else {
            next();
            // callback();
            // res.render(pathToRender, {});
        }
        });
}