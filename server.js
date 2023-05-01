const express = require("express");
const app = express();
const { Client } = require("pg");
const bcr = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");

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
app.use(flash());

app.get(["/","/home","/index"], function(req, res){
    res.render("pages/index");
});

app.get("/utilizator/login", function(req, res){
    res.render("pages/login");
});

app.get("/utilizator/signup", function(req, res){
    res.render("pages/signup");
});

app.get("/utilizator/home", function(req, res){
    res.render("pages/useracc",{user_email:"abc@def"});
});

app.post("/utilizator/signup", async function(req, res){
    let {nume, prenume, email, parola, parola_conf, tel, addr} = req.body;
        /* console.log({
            nume,
            prenume,
            email,
            parola,
            parola_conf,
            tel,
            addr
        }); */

    let err = [];
    if(!nume || !prenume || !email || !parola || !parola_conf){
        err.push({mesaj:"Va rugam introduceti toate datele necesare!"});
    };

    if(parola.length <8){
        err.push({mesaj:"Parola trebuie sa aiba minim 8 caractere!"});
    }

    if(parola != parola_conf){
        err.push({mesaj:"Parolele nu se potrivesc!"});
    }

    if(err.length>0){
        res.render("pages/signup", {err})
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
                            }
                            req.flash("succes", "Contul a fost creat");
                            res.redirect("/utilizator/login");
                        }
                    )
                }
            }
        )
    }

    // console.log(err);
})

app.listen(PORT, ()=>{
    console.log(`Serverul a pornit, port: ${PORT}`);
});
