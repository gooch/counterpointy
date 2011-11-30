$(document).ready(function () {

    $('.point').click(function () {
        document.location = '/point/' + $(this).data('pointHash');
    });

});
