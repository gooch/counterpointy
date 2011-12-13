$(document).ready(function () {

    $('.point').click(function () {
        document.location = '/point/' + $(this).data('pointHash');
    });

    $('.expandable').click(function () {
        $(this).hide().next().show().children('textarea').focus();
    });

    $('.expandable').next().hide();

    $('.focus-on-load').focus();

});
