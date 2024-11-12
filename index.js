//daniel
//daniel 2
// dnaiel 3



let express = require('express');

let app = express();

let path = require('path');

const port = 3000;

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({extended: true}));

app.get('/', (req, res) => {
    res.render('index', {
        title: 'Welcome to SkillShare',
        featuredCourses: courses.slice(0, 3)
    });
});

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

app.listen(port, () => console.log('Listening'));

// Riley 