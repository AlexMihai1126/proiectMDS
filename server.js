const express = require("express");
const app = express();
const { Client } = require("pg");
const bcr = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const initPassport = require("./passportConfig");

initPassport(passport);

var client= new Client({database:"mds",
        user:"alexm1126",
        password:"alex",
        host:"localhost",
        port:5432});
client.connect();

const PORT= process.env.PORT || 32767;

app.set("view engine","ejs");

app.use("/static", express.static(__dirname+"/static"));
app.use(express.urlencoded({extended:false}));
app.use(session({
    secret: 'secret', //cheie de criptre sesiune
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.get(["/","/home","/index"], function(req, res){
    res.render("pages/index");
});

app.get("/utilizator/signup", function(req, res){
    res.render("pages/signup");
});


app.get("/utilizator/login", function(req, res){
    res.render("pages/login");
});

app.get(["/stoc","/masini"], function(req, res){
    client.query(
        `SELECT m.brand, m.model, m.vin, m.pret, m.an_fabricatie, m.accident, m.km, m.descriere, m.imagine FROM masina m`, function(queryErr, queryRes){
            if(queryErr){
                throw queryErr;
            }else{
                //console.log(queryRes.rows);
                res.render("pages/masini", {masini: queryRes.rows});
            }
        });
});

app.get("/utilizator/home", function(req, res){
    res.render("pages/useracc",{user_email:"email", role:"1"}); //todo
});

app.post("/utilizator/signup", async function(req, res){
    let {nume, prenume, email, parola, parola_conf, tel, addr} = req.body; //citim din formular in acest obiect
    let err = []; //vectorul de erori pe care il vom trimite catre ejs pt afisare
    if(!nume || !prenume || !email || !parola || !parola_conf){
        err.push({mesaj:"Va rugam introduceti toate datele necesare!"});
    }; //daca nu exista da eroare (am rezolvat cu validare la nivel de formular)

    if(parola.length <8){
        err.push({mesaj:"Parola trebuie sa aiba minim 8 caractere!"});
    }

    if(parola != parola_conf){
        err.push({mesaj:"Parolele nu se potrivesc!"});
    }

    if(err.length>0){
        res.render("pages/signup", {err}); //daca avem erori vom regenera pagina cu erorile afisate
    } else{
        let hashPass= await bcr.hash(parola, 10); //cripteaza parola cu 10 runde de criptare in algoritm
        client.query(
            `SELECT * FROM utilizatori WHERE email = $1`, [email] , function(queryErr, queryRez){
                if(queryErr){
                    throw queryErr;
                }

                if(queryRez.rows.length>0){
                    err.push({mesaj:"Deja ai un cont la noi pe site! Acest email deja exista in baza de date."});
                    res.render("pages/signup", {err});
                }else{
                    client.query(
                        `INSERT INTO utilizatori (nume, prenume, email, parola, telefon, adresa) values($1, $2, $3, $4, $5, $6) RETURNING id, parola`, [nume, prenume, email, hashPass, tel, addr], function(queryErrIns, queryResIns){
                            if(queryErrIns){
                                throw queryErrIns;
                            } //cererea in baza de date care introduce noul user
                            req.flash("succes", "Contul a fost creat");
                            res.redirect("/utilizator/login"); //redirectioneaza catre pagina de login
                        }
                    )
                }
            }
        )
    }

    // console.log(err);
});

app.post("/utilizator/login", passport.authenticate('local', {
    successRedirect: '/utilizator/home',
    failureRedirect: '/utilizator/login',
    failureFlash: true
})); //folosim libraria passport pentru a autentifica utilizatorul si crea cookie-ul

app.post("/utilizator/logout", function(req, res, next){
    req.logout(function(err){
        if(err){
            return next(err);
        }
        res.redirect("/index");
    });
});

app.listen(PORT, ()=>{
    console.log(`Serverul a pornit, port: ${PORT}`);
});