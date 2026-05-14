import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const LoadingImage = ({
  src,
  alt = '',
  imageClassName = '',
  skeletonClassName = '',
  skeleton = true,
  ...imageProps
}) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  return (
    <>
      {skeleton && !loaded && !failed && (
        <div
          className={`absolute inset-0 z-0 animate-pulse bg-gradient-to-br from-[#0b1120] via-[#1f2937] to-[#05070c] ${skeletonClassName}`}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(200,170,110,0.16),transparent_36%)]" />
          <div className="absolute inset-x-8 top-1/2 h-px bg-gradient-to-r from-transparent via-[#c8aa6e]/35 to-transparent" />
        </div>
      )}

      {failed ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#0b1120] text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
          Sin imagen
        </div>
      ) : null}

      {src ? (
        <img
          {...imageProps}
          src={src}
          alt={alt}
          onLoad={(event) => {
            setLoaded(true);
            imageProps.onLoad?.(event);
          }}
          onError={(event) => {
            setFailed(true);
            imageProps.onError?.(event);
          }}
          className={`relative z-10 block ${imageClassName}`}
        />
      ) : null}
    </>
  );
};

LoadingImage.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  imageClassName: PropTypes.string,
  skeletonClassName: PropTypes.string,
  skeleton: PropTypes.bool,
  onLoad: PropTypes.func,
  onError: PropTypes.func,
};

export default LoadingImage;
