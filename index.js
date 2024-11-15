let express = require('express');

const bodyParser = require('body-parser');

let app = express();

let path = require('path');

const port = 3000;

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({extended: true}));

app.use(express.static('public'));

const knex = require('knex') ({
    client : 'pg',
    connection: {
        host: 'localhost',
        user: 'postgres',
        password: 'is403',
        database: 'groupproject',
        port: 5432
    }
})

const users = {
    user1: 'password1',
    user2: 'password2'
};

app.get('/', (req, res) => {
    res.render('login');
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username] === password) {
        res.redirect('/landingPage');
    } else {
        res.send('Invalid credentials');
    }
});

app.get('/landingPage', (req, res) => {
    res.render('landingPage', {
        title: 'Landing Page'
    });
});

app.get('/profile', (req, res) => {
    res.render('profile', {
        title: 'profile'
    });
});

app.listen(port, () => console.log('Listening'));