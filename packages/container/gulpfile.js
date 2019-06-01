let gulp = require('gulp');
let clean = require('gulp-clean');

gulp.task('clean', () => {
    return gulp
        .src(__dirname + '/build', { read: false })
        .pipe(clean());
});