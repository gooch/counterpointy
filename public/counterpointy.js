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
        return false;
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
            $('.pstance select').attr('disabled', 'disabled');
            editdiv.show().find('textarea').focus().select();
        }
    });

    $('.main-point-edit .cancel-button').click(function () {
        var text = $('.main-point').data('text');
        $('.main-point-edit textarea').val(text);
        $('.main-point-edit').hide();
        $('.main-point').show();
        $('.pstance select').removeAttr('disabled');
        return false;
    });

    $('.pstance select').change(function () {
        $(this).parents('form').submit();
    });

});
