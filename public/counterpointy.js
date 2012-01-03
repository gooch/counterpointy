$(document).ready(function () {

    function targetIsNotThePoint(event) {
        return {
            'a': true,
            'input': true
        }[event.target.nodeName.toLowerCase()];
    }

    $('.point').click(function (event) {
        if (targetIsNotThePoint(event)) {
            return;
        }
        document.location = '/point/' + $(this).data('pointHash');
    });

    $('.expandable').click(function () {
        $(this).hide().next().show().children('textarea').focus();
    });

    $('.expandable').next().hide();

    $('.focus-on-load').focus();

    $('.main-point').click(function (event) {
        if (targetIsNotThePoint(event)) {
            return;
        }
        var editdiv = $('.main-point-edit');
        if (editdiv.length) {
            $(this).hide();
            editdiv.show().find('textarea').focus();
        }
    });

    $('.pstance select').change(function () {
        $(this).parents('form').submit();
    });

});
