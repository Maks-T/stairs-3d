(vl-load-com)

(defun c:FILL_STAMP ( / doc ms pt0 sc draw-t)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (setq ms  (vla-get-ModelSpace doc))
  (vla-StartUndoMark doc)

  (setq pt0 (getpoint "\nУкажите правый нижний угол штампа: "))
  (if pt0
    (progn
      (setq sc (getreal "\nВведите масштаб <16.0>: "))
      (if (null sc) (setq sc 16.0))

      ;; Функция вставки текста с гарантированным выравниванием
      ;; align: "MC" = точно по центру (10), "ML" = по левому краю по высоте середины строки (9)
      (defun draw-t (txt pt h align / p3d obj)
        (setq p3d (vlax-3d-point (list (+ (car pt0) (* (car pt) sc))
                                       (+ (cadr pt0) (* (cadr pt) sc))
                                       0.0)))
        (setq obj (vla-AddText ms txt p3d (* h sc)))
        (if (= align "MC")
          (progn
            (vla-put-Alignment obj 10) ; acAlignmentMiddleCenter
            (vla-put-TextAlignmentPoint obj p3d)
          )
          (progn
            (vla-put-Alignment obj 9)  ; acAlignmentMiddleLeft
            (vla-put-TextAlignmentPoint obj p3d)
          )
        )
      )

      ;; 1. Фамилии (аккуратный шрифт 2.5 мм, строго по центру строк с отступом слева)
      (draw-t "Цацура М.Н." '(-166.0 27.5) 2.5 "ML")
      (draw-t "Угликов А.М." '(-166.0 22.5) 2.5 "ML")

      ;; 2. Дата (по центру колонки дат)
      (draw-t "10.26" '(-125.0 27.5) 2.2 "MC")
      (draw-t "10.26" '(-125.0 22.5) 2.2 "MC")

      ;; 3. Наименование чертежа (ровно по центру поля 70х25 мм)
      (draw-t "Каркас лестницы" '(-85.0 27.5) 4.5 "MC")

      ;; 4. Обозначение чертежа вверху (по центру поля 120х15 мм)
      (draw-t "ВСТГ.001.000 СБ" '(-60.0 47.5) 5.0 "MC")

      ;; 5. Литера «Р» (по центру ячейки литеры)
      (draw-t "Р" '(-42.5 27.5) 3.5 "MC")

      ;; 6. Компания ООО «Вистегра» (шрифт 3.8 мм, идеально вписывается в ячейку 50х15 мм)
      (draw-t "ООО «Вистегра»" '(-25.0 7.5) 3.8 "MC")

      (princ "\nШтамп успешно заполнен!")
    )
  )

  (vla-EndUndoMark doc)
  (princ)
)